import { notFound } from "next/navigation";
import { MovieResults } from "@/components/movies/movie-results";
import { SearchFormPreview } from "./search-form-preview";
import type { Movie } from "@/types/movie";

const sampleMovies: Movie[] = [
  {
    tmdbId: 1,
    title: "サンプル映画：長いタイトルでもレイアウトが崩れないか確認する作品",
    releaseDate: "2026-10-16",
    posterUrl: "/sample-poster.svg",
  },
  {
    tmdbId: 2,
    title: "公開日・画像が未登録の作品",
    releaseDate: null,
    posterUrl: null,
  },
];

/** UI担当がAPIキーなしで作業するための開発専用ページ。 */
export default function PlaygroundPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <>
      <h1>コンポーネント確認</h1>
      <p>開発時専用。仮データで各表示を確認できます。TMDbには接続しません。</p>

      <section className="playground-section">
        <h2>担当A：検索フォーム</h2>
        <SearchFormPreview />
      </section>

      <section className="playground-section">
        <h2>担当B：検索前</h2>
        <MovieResults state={{ status: "idle" }} />
      </section>

      <section className="playground-section">
        <h2>担当B：検索中</h2>
        <MovieResults state={{ status: "loading", query: "サンプル" }} />
      </section>

      <section className="playground-section">
        <h2>担当B：結果あり</h2>
        <MovieResults state={{ status: "success", query: "サンプル", movies: sampleMovies }} />
      </section>

      <section className="playground-section">
        <h2>担当B：0件</h2>
        <MovieResults state={{ status: "success", query: "サンプル", movies: [] }} />
      </section>

      <section className="playground-section">
        <h2>担当B：エラー</h2>
        <MovieResults state={{
          status: "error",
          query: "サンプル",
          message: "接続できませんでした。もう一度お試しください。",
        }} />
      </section>
    </>
  );
}
