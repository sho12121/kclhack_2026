import { validateMovieQuery } from "@/lib/movie-search";
import { MovieSearchError, searchMovies } from "@/lib/tmdb";
import type { MovieSearchResponse, MovieSearchErrorResponse } from "@/types/movie";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
  const inputError = validateMovieQuery(query);
  const headers = { "Cache-Control": "no-store" };

  if (inputError) {
    return Response.json({ error: inputError } satisfies MovieSearchErrorResponse, { status: 400, headers });
  }

  try {
    const results = await searchMovies(query);
    return Response.json({ results } satisfies MovieSearchResponse, { headers });
  } catch (error) {
    // 上流のレスポンス本文や例外の詳細は返さない。
    const message = error instanceof MovieSearchError ? error.message : "映画検索に失敗しました。";
    const status = error instanceof MovieSearchError ? error.status : 500;
    return Response.json({ error: message } satisfies MovieSearchErrorResponse, { status, headers });
  }
}
