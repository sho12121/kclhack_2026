import { validateMovieQuery } from "@/lib/movie-search";
import { MovieSearchError, searchMovies } from "@/lib/tmdb";
import type { MovieSearchResponse, MovieSearchErrorResponse } from "@/types/movie";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("query")?.trim() ?? "";
  const restricted = params.get("include_restricted") ?? "false";
  const inputError = validateMovieQuery(query);
  const headers = { "Cache-Control": "no-store" };

  if (inputError) {
    return Response.json({ error: inputError } satisfies MovieSearchErrorResponse, { status: 400, headers });
  }

  if (restricted !== "true" && restricted !== "false") {
    return Response.json({ error: "検索条件が正しくありません。" } satisfies MovieSearchErrorResponse, { status: 400, headers });
  }

  try {
    const results = await searchMovies(query, { includeRestricted: restricted === "true" });
    return Response.json({ results } satisfies MovieSearchResponse, { headers });
  } catch (error) {
    // 上流のレスポンス本文や例外の詳細は返さない。
    const message = error instanceof MovieSearchError ? error.message : "映画検索に失敗しました。";
    const status = error instanceof MovieSearchError ? error.status : 500;
    return Response.json({ error: message } satisfies MovieSearchErrorResponse, { status, headers });
  }
}
