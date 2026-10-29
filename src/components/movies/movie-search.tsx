"use client";

import { useEffect, useRef, useState } from "react";
import type {
  MovieSearchResponse,
  MovieSearchErrorResponse,
  MovieSearchState,
  Movie,
} from "@/types/movie";
import { SearchForm } from "./search-form";
import { MovieResults } from "./movie-results";

/** S担当: フォームと表示の間に入り、通信と状態の変更を管理する。 */
export type MovieSearchProps = {
  onSelect?: (movie: Movie) => void;
  selectedMovieId?: number;
};

export function MovieSearch({ onSelect, selectedMovieId }: MovieSearchProps = {}) { //この関数が、page.tsxで読み込んだMovieSearchコンポーネント
  const [state, setState] = useState<MovieSearchState>({ status: "idle" });
  //このstateをreturn内で子のSearchFormコンポーネントに渡している。初期値は"idle"
// "idle"	まだ検索していない
// "loading"	検索を始めて、結果を待っている
// "success"	検索に成功した
// "error"	検索に失敗した

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
      {/* handleSearchはこのMovieSearch関数内にある関数で、それを子であるSearchFormコンポーネントに渡している。 */}
      {/*state.status=== "loading" で、stateという変数にstatus要素を見て、検索中かどうかを調べる→trueかfalseを渡す */}
      <MovieResults state={state} onSelect={onSelect} selectedMovieId={selectedMovieId} />
      {/*  MovieSearchは検索フォームと検索結果を配置している。 */}
    </>
  );
}
