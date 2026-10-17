import type { MovieSearchState } from "@/types/movie";
import { MovieCard } from "./movie-card";
import styles from "./movie-results.module.css";

export type MovieResultsProps = { state: MovieSearchState };

/** UI担当B: 親から渡された状態を描画する。ここでは通信しない。 */
export function MovieResults({ state }: MovieResultsProps) {
  return (
    <section
      className={styles.results}
      aria-label="映画の検索結果"
      aria-busy={state.status === "loading"}
    >
      <div role="status" aria-live="polite" aria-atomic="true">
        {state.status === "idle" && (
          <div className={styles.message}>
            <span className={styles.messageIcon} aria-hidden="true">◒</span>
            <h2>どんな映画を話そう？</h2>
            <p>タイトルを検索すると、ここに作品が並びます。</p>
          </div>
        )}

        {state.status === "loading" && (
          <div className={styles.message}>
            <span className={styles.loadingDot} aria-hidden="true" />
            <p>「{state.query}」を探しています…</p>
          </div>
        )}

        {state.status === "success" && state.movies.length === 0 && (
          <div className={styles.message}>
            <h2>作品が見つかりませんでした</h2>
            <p>「{state.query}」の表記を変えるか、別のタイトルを試してみてください。</p>
          </div>
        )}

        {state.status === "success" && state.movies.length > 0 && (
          <div className={styles.resultHeading}>
            <h2>「{state.query}」の検索結果</h2>
            <p>表示 {state.movies.length}件<span> · 最初の1ページ</span></p>
          </div>
        )}
      </div>

      {state.status === "error" && (
        <div className={`${styles.message} ${styles.error}`} role="alert">
          <h2>検索できませんでした</h2>
          <p>{state.message}</p>
        </div>
      )}

      {state.status === "success" && state.movies.length > 0 && (
        <ul className={styles.grid}>
          {state.movies.map((movie) => (
            <li key={movie.tmdbId}>
              <MovieCard movie={movie} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
