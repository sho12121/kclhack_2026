"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { MovieSearch } from "@/components/movies/movie-search";
import { formatBoardDate, MAX_BOARD_CAPACITY, MAX_BOARD_TITLE_LENGTH, MIN_BOARD_CAPACITY, validateBoardDraft } from "@/lib/board-draft";
import type { BoardDraft } from "@/types/board";
import type { Movie } from "@/types/movie";
import styles from "./boards.module.css";

export function BoardCreateForm() {
  const id = useId();
  const [title, setTitle] = useState("");
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [capacity, setCapacity] = useState("4");
  const [endDateTime, setEndDateTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BoardDraft | null>(null);

  function invalidatePreview() {
    setPreview(null);
    setError(null);
  }

  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateBoardDraft({ title, movie, capacity, endDateTime });
    setError(result.error);
    setPreview(result.draft);
  }

  return (
    <section className={styles.panel} aria-labelledby={`${id}-heading`}>
      <div className={styles.heading}>
        <h2 id={`${id}-heading`}>掲示板を作成</h2>
        <Link href="/">閉じる</Link>
      </div>
      <p>タイトル・映画・定員・終了日時を設定できます。今回は入力内容の確認までで、保存・公開はされません。</p>

      <div className={styles.field}>
        <label htmlFor={`${id}-title`}>掲示板のタイトル</label>
        {/* 映画検索のformと入れ子にしないため、所属先のformを明示する。 */}
        <input
          id={`${id}-title`} form={`${id}-form`} name="title" required
          maxLength={MAX_BOARD_TITLE_LENGTH} value={title}
          placeholder="例：この映画のラストについて話したい"
          onChange={(event) => { setTitle(event.target.value); invalidatePreview(); }}
        />
      </div>

      <fieldset className={styles.moviePicker}>
        <legend>話したい映画</legend>
        <p role="status">{movie ? `選択中：${movie.title}` : "映画が選択されていません。"}</p>
        <button
          className={styles.secondary} type="button"
          aria-expanded={isSearchOpen} aria-controls={`${id}-search`}
          onClick={() => setIsSearchOpen(!isSearchOpen)}
        >
          {isSearchOpen ? "映画検索を閉じる" : movie ? "映画を選び直す" : "映画を検索する"}
        </button>
        <div id={`${id}-search`} hidden={!isSearchOpen}>
          {isSearchOpen && (
            <MovieSearch
              selectedMovieId={movie?.tmdbId}
              onSelect={(selected) => {
                setMovie(selected);
                setIsSearchOpen(false);
                invalidatePreview();
              }}
            />
          )}
        </div>
      </fieldset>

      <form id={`${id}-form`} onSubmit={handleConfirm}>
        <div className={styles.field}>
          <label htmlFor={`${id}-capacity`}>定員（作成者を含む）</label>
          <input
            id={`${id}-capacity`} name="capacity" type="number" required
            min={MIN_BOARD_CAPACITY} max={MAX_BOARD_CAPACITY} step="1" value={capacity}
            onChange={(event) => { setCapacity(event.target.value); invalidatePreview(); }}
          />
          <small>{MIN_BOARD_CAPACITY}〜{MAX_BOARD_CAPACITY}人で設定できます。</small>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-ends`}>掲示板の終了日時（日本時間）</label>
          <input
            id={`${id}-ends`} name="endDateTime" type="datetime-local" required
            value={endDateTime}
            onChange={(event) => { setEndDateTime(event.target.value); invalidatePreview(); }}
          />
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button className={styles.primary} type="submit">作成内容を確認</button>
          <Link href="/">キャンセル</Link>
        </div>
      </form>

      {preview && (
        <section className={styles.preview} aria-labelledby={`${id}-preview`}>
          <h3 id={`${id}-preview`}>入力内容の確認</h3>
          <p role="status">入力内容を確認しました。まだ保存・公開されていません。</p>
          <dl>
            <dt>タイトル</dt><dd>{preview.title}</dd>
            <dt>映画</dt><dd>{preview.movie.title}</dd>
            <dt>定員</dt><dd>{preview.capacity}人（作成者を含む）</dd>
            <dt>終了日時</dt><dd>{formatBoardDate(preview.endsAt)}（日本時間）</dd>
          </dl>
        </section>
      )}
    </section>
  );
}
