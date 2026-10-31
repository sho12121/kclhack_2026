export type MovieCertification = "G" | "PG12" | "R15+" | "R18+";

/** TMDbのレスポンスそのものではなく、画面が必要とする映画データ。 */
export type Movie = {
  tmdbId: number;
  title: string;
  releaseDate: string | null;
  posterUrl: string | null;
  certification?: MovieCertification;
  genres?: string[];
};

export type MovieSearchResponse = { results: Movie[] };
export type MovieSearchErrorResponse = { error: string };

/** 状態ごとに必要なデータを決め、表示の矛盾を防ぐ。 */
export type MovieSearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "success"; query: string; movies: Movie[] }
  | { status: "error"; query: string; message: string };
