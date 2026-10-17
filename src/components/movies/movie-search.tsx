"use client";

import { useEffect, useRef, useState } from "react";
import type {
  MovieSearchResponse,
  MovieSearchErrorResponse,
  MovieSearchState,
} from "@/types/movie";
import { SearchForm } from "./search-form";
import { MovieResults } from "./movie-results";

/** 経験者担当: フォームと表示の間に入り、通信と状態の変更を管理する。 */
export function MovieSearch() {
  const [state, setState] = useState<MovieSearchState>({ status: "idle" });
  const activeRequest = useRef<AbortController | null>(null);

  // ページを離れたら、不要になったブラウザ側の通信を止める。
  useEffect(() => () => activeRequest.current?.abort(), []);

  async function handleSearch(query: string) {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setState({ status: "loading", query });

    try {
      const params = new URLSearchParams({ query });
      const response = await fetch(`/api/movies/search?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await response.json() as MovieSearchResponse | MovieSearchErrorResponse;

      if (!response.ok || !("results" in data)) {
        const message = "error" in data ? data.error : "映画を検索できませんでした。";
        if (!controller.signal.aborted) {
          setState({ status: "error", query, message });
        }
        return;
      }

      // 中断済みの古いリクエストで新しい検索結果を上書きしない。
      if (!controller.signal.aborted) {
        setState({ status: "success", query, movies: data.results });
      }
    } catch {
      if (controller.signal.aborted) return;
      setState({
        status: "error",
        query,
        message: "接続できませんでした。通信環境を確認して再検索してください。",
      });
    }
  }

  return (
    <>
      <SearchForm onSearch={handleSearch} isLoading={state.status === "loading"} />
      <MovieResults state={state} />
    </>
  );
}
