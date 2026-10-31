import "server-only";
import type { Movie } from "@/types/movie";
import { getJapaneseCertification, isGeneralAudience } from "./movie-certification.ts";

// 個別に確認した除外対象。追加時は作品IDと理由を記録する。
const excludedMovieIds = new Set([
  1714414, // 「ちいかわ」で混入した、関連グラビアビデオ。
]);

export class MovieSearchError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MovieSearchError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toMovie(value: unknown): Movie {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) || value.id <= 0 ||
    typeof value.title !== "string" || !value.title.trim()
  ) {
    throw new MovieSearchError("映画データを読み取れませんでした。時間をおいて再検索してください。", 502);
  }

  const posterPath = typeof value.poster_path === "string" && /^\/[a-zA-Z0-9._-]+$/.test(value.poster_path)
    ? value.poster_path : null;

  return {
    tmdbId: value.id,
    title: value.title,
    releaseDate: typeof value.release_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.release_date)
      ? value.release_date : null,
    posterUrl: posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : null,
  };
}

function checkResponse(response: Response) {
  if (response.status === 429) {
    throw new MovieSearchError("検索が混み合っています。少し待ってから再検索してください。", 429);
  }
  if (!response.ok) {
    throw new MovieSearchError("映画を取得できませんでした。時間をおいて再検索してください。", 502);
  }
}

/** 年齢区分は作品IDごとに1日キャッシュ。検索語・利用者の設定は保存しない。 */
async function getMovieCertification(id: number, token: string, signal: AbortSignal) {
  const response = await fetch(`https://api.themoviedb.org/3/movie/${id}/release_dates`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal,
    next: { revalidate: 86_400 },
  });
  checkResponse(response);
  const data: unknown = await response.json();
  if (!isRecord(data) || !Array.isArray(data.results)) {
    throw new MovieSearchError("映画の年齢区分を確認できませんでした。時間をおいて再検索してください。", 502);
  }
  return getJapaneseCertification(data);
}

/** この関数だけがTMDbの認証情報とレスポンス形式を知る。 */
export async function searchMovies(
  query: string,
  { includeRestricted = false }: { includeRestricted?: boolean } = {},
): Promise<Movie[]> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new MovieSearchError("映画検索の準備ができていません。管理者にお問い合わせください。", 503);
  }

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");

  // 作品別の区分確認も含めた上限。検索本体には従来どおり10秒の上限を設ける。
  const signal = AbortSignal.timeout(30_000);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
      cache: "no-store",
    });

    checkResponse(response);

    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.results)) {
      throw new MovieSearchError("映画データを読み取れませんでした。時間をおいて再検索してください。", 502);
    }
    // APIへの除外指定に加え、返却結果も確認する。
    // adultフラグは明確にfalseのものだけ許可する。日本の年齢区分の未登録とは別に判定する。
    const candidates = data.results
      .filter((value: unknown) => isRecord(value) && value.adult === false && !excludedMovieIds.has(value.id as number))
      .slice(0, 20)
      .map(toMovie);

    const movies: (Movie | null)[] = Array(candidates.length).fill(null);
    let nextIndex = 0;
    // 最大4件を並行取得。遅い1件を待たず、空いた枠で次の作品を確認する。
    const worker = async () => {
      while (nextIndex < candidates.length) {
        const index = nextIndex++;
        const movie = candidates[index];
        const certification = await getMovieCertification(movie.tmdbId, token, signal);
        if (!certification || includeRestricted || isGeneralAudience(certification)) {
          movies[index] = certification ? { ...movie, certification } : movie;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, candidates.length) }, () => worker()));
    return movies.filter((movie): movie is Movie => movie !== null);
  } catch (error) {
    if (error instanceof MovieSearchError) throw error;
    if (signal.aborted || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name))) {
      throw new MovieSearchError("検索に時間がかかっています。もう一度お試しください。", 504);
    }
    throw new MovieSearchError("映画検索に接続できませんでした。時間をおいて再検索してください。", 502);
  }
}

/** 掲示板保存時は、ブラウザからの作品名・画像URLを信用せずTMDbから再取得する。 */
export async function getMovieForBoard(id: number): Promise<Movie> {
  if (!Number.isSafeInteger(id) || id <= 0 || excludedMovieIds.has(id)) {
    throw new MovieSearchError("この映画は選択できません。", 400);
  }
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) throw new MovieSearchError("映画検索の準備ができていません。", 503);
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=ja-JP`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000), next: { revalidate: 3600 },
    });
    checkResponse(response);
    const data: unknown = await response.json();
    if (!isRecord(data) || data.adult !== false || data.id !== id) throw new MovieSearchError("この映画は選択できません。", 400);
    const movie = toMovie(data);
    const genres = Array.isArray(data.genres) ? data.genres.filter(isRecord).map(g => g.name).filter((name): name is string => typeof name === "string" && name.length <= 80).slice(0, 20) : [];
    return { ...movie, genres };
  } catch (error) {
    if (error instanceof MovieSearchError) throw error;
    throw new MovieSearchError("映画情報を確認できませんでした。時間をおいて再度お試しください。", 502);
  }
}
