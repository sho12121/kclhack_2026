import "server-only";
import type { Movie } from "@/types/movie";

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

/** この関数だけがTMDbの認証情報とレスポンス形式を知る。 */
export async function searchMovies(query: string): Promise<Movie[]> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new MovieSearchError("映画検索の準備ができていません。管理者にお問い合わせください。", 503);
  }

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");

  // 通信開始だけでなく、JSONの読み取りまでを10秒に制限する。
  const signal = AbortSignal.timeout(10_000);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal,
      cache: "no-store",
    });

    if (response.status === 429) {
      throw new MovieSearchError("検索が混み合っています。少し待ってから再検索してください。", 429);
    }
    if (!response.ok) {
      throw new MovieSearchError("映画を取得できませんでした。時間をおいて再検索してください。", 502);
    }

    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.results)) {
      throw new MovieSearchError("映画データを読み取れませんでした。時間をおいて再検索してください。", 502);
    }
    // 最初の段階では1ページ分だけを表示する。
    return data.results.slice(0, 20).map(toMovie);
  } catch (error) {
    if (error instanceof MovieSearchError) throw error;
    if (signal.aborted || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name))) {
      throw new MovieSearchError("検索に時間がかかっています。もう一度お試しください。", 504);
    }
    throw new MovieSearchError("映画検索に接続できませんでした。時間をおいて再検索してください。", 502);
  }
}
