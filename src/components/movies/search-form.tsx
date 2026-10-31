"use client";

import { useId, useState, type FormEvent } from "react";
import { MAX_QUERY_LENGTH, validateMovieQuery } from "@/lib/movie-search";
import styles from "./search-form.module.css";

export type SearchFormProps = {
  onSearch: (query: string) => void;
  isLoading: boolean;
  includeRestricted?: boolean;
  onRestrictedChange?: (value: boolean) => void;
};

/** UI担当A: 入力と入力チェックを担当。APIのURLや認証情報は扱わない。 */
export function SearchForm({ onSearch, isLoading, includeRestricted = false, onRestrictedChange }: SearchFormProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    const inputError = validateMovieQuery(query);
    setError(inputError);
    if (!inputError) onSearch(query.trim());
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search" aria-label="映画検索">
      <label className={styles.label} htmlFor={id}>映画のタイトル</label>
      <div className={styles.inputRow}>
        <input
          id={id}
          className={styles.input}
          type="search"
          name="query"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setError(null); }}
          placeholder="例：君の名は。"
          maxLength={MAX_QUERY_LENGTH}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          autoComplete="off"
          required
        />
        <button className={styles.button} type="submit" disabled={isLoading}>
          {isLoading ? "検索中…" : "映画を探す"}
          {!isLoading && <span aria-hidden="true">↗</span>}
        </button>
      </div>
      <p className={styles.hint} id={`${id}-hint`}>日本語・英語のタイトルで検索できます。</p>
      {onRestrictedChange && (
        <div className={styles.restrictionSetting}>
          <label className={styles.restrictionLabel}>
            <input type="checkbox" checked={includeRestricted}
              onChange={(event) => onRestrictedChange(event.target.checked)} />
            年齢制限のある作品も表示（R15+・R18+）
          </label>
          <p className={styles.hint}>通常はR15+・R18+を除外します。年齢区分が未登録の作品も表示します。成人向け分類の作品と個別の除外対象は表示しません。</p>
        </div>
      )}
      {error && <p className={styles.error} id={`${id}-error`} role="alert">{error}</p>}
    </form>
  );
}
