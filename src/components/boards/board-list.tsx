"use client";

import { useEffect, useId, useState } from "react";
import type { BoardSummary } from "@/types/board";
import Image from "next/image";
import Link from "next/link";
import { formatBoardDate } from "@/lib/board-draft";
import { CalendarIcon, ChatIcon, FilmIcon, UsersIcon } from "@/components/ui/icons";
import styles from "./boards.module.css";
import { FavoriteButton } from "./favorite-button";

export function BoardList({ boards, isSample = false, initialNow }: {
  boards: BoardSummary[];
  isSample?: boolean;
  initialNow: number;
}) {
  const [now, setNow] = useState(initialNow);
  const [noticeBoardId, setNoticeBoardId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const id = useId();
  const genres = [...new Set(boards.flatMap(board => board.movie.genres ?? []))].sort((a, b) => a.localeCompare(b, "ja"));
  const visibleBoards = boards.filter(board => {
    const isStarted = Date.parse(board.startsAt) <= now;
    const matchesStatus = statusFilter === "all" || (statusFilter === "live" ? isStarted : !isStarted);
    return matchesStatus && (!genreFilter || board.movie.genres?.includes(genreFilter));
  }).sort((a, b) => {
    const aStarted = Date.parse(a.startsAt) <= now;
    const bStarted = Date.parse(b.startsAt) <= now;
    if (aStarted !== bStarted) return aStarted ? -1 : 1;
    const difference = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return (sortOrder === "newest" ? -difference : difference) || a.id.localeCompare(b.id);
  });
  const hasFilters = statusFilter !== "all" || genreFilter !== "";

  function resetFilters() {
    setStatusFilter("all");
    setGenreFilter("");
    setSortOrder("newest");
  }
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section aria-labelledby="board-list-title">
      <div className={styles.listHeading}>
        <h2 id="board-list-title"><ChatIcon />掲示板一覧</h2>
        <span role="status" aria-live="polite" aria-atomic="true">{visibleBoards.length}件{hasFilters && ` / 全${boards.length}件`}</span>
      </div>
      <div className={styles.boardFilters} role="group" aria-label="掲示板の絞り込みと並び替え">
        <div>
          <label htmlFor={`${id}-genre`}>映画のジャンル</label>
          <select id={`${id}-genre`} value={genreFilter} onChange={event => setGenreFilter(event.target.value)}>
            <option value="">すべてのジャンル</option>
            {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-status`}>開催状況</label>
          <select id={`${id}-status`} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">すべて</option>
            <option value="upcoming">開催予定のみ</option>
            <option value="live">開催中のみ</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-sort`}>並び順（掲示板の作成日時）</label>
          <select id={`${id}-sort`} value={sortOrder} onChange={event => setSortOrder(event.target.value)}>
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
          </select>
        </div>
      </div>
      {boards.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true"><ChatIcon /></span>
          <h3>まだ掲示板はありません</h3>
          <p>あなたが語りたい映画は何ですか？<br />「掲示板を作成する」から、会話を始めてみましょう。</p>
        </div>
      ) : visibleBoards.length === 0 ? (
        <div className={styles.empty}>
          <h3>条件に合う掲示板がありません</h3>
          <p>ジャンルや開催状況を変更してみてください。</p>
          <button type="button" className={styles.secondary} onClick={resetFilters}>絞り込みを解除</button>
        </div>
      ) : (
        <ul className={styles.list}>
          {visibleBoards.map((board) => {
            const isStarted = Date.parse(board.startsAt) <= now;
            const remaining = board.capacity === null ? null : Math.max(0, board.capacity - board.participantCount);
            const isFull = remaining === 0;
            const isMember = board.isMember === true;
            const buttonLabel = isMember ? "会話を開く" : isFull ? "満員" : isStarted ? "参加する" : "参加申し込み";
            return (
              <li key={board.id} className={styles.panel}>
                <div className={styles.boardCard}>
                  {board.movie.posterUrl && <Image className={styles.boardPoster} src={board.movie.posterUrl}
                    alt={`${board.movie.title}のポスター`} width={90} height={135} sizes="(max-width: 600px) 64px, 90px" />}
                  <div className={styles.boardDetails}>
                    <span className={`${styles.boardStatus} ${isStarted ? styles.boardLive : ""}`}>
                      {isStarted ? "開催中" : "開催予定"}
                    </span>
                    <h3>{board.title}</h3>
                    <p>{board.allowGuests ? "ゲスト参加OK" : "登録ユーザー限定"}</p>
                    <p className={styles.boardMovie}><FilmIcon />{board.movie.title}</p>
                    {board.movie.genres && <ul className={styles.genreTags} aria-label="映画のジャンル">
                      {board.movie.genres.map(genre => <li key={genre}>{genre}</li>)}
                    </ul>}
                  </div>
                </div>
                {!isSample && <FavoriteButton key={`${board.id}-${board.isFavorite}`} boardId={board.id} initialFavorite={board.isFavorite} />}
                <dl className={styles.boardInfo}>
                  <div>
                    <dt><UsersIcon />参加人数・定員</dt>
                    <dd>{board.participantCount}人参加<span> / {board.capacity === null ? "定員なし" : `定員${board.capacity}人`}</span></dd>
                  </div>
                  <div>
                    <dt><CalendarIcon />開始日時</dt>
                    <dd><time dateTime={board.startsAt}>{formatBoardDate(board.startsAt)}</time></dd>
                  </div>
                </dl>
                <div className={styles.boardJoinRow}>
                  <p className={styles.boardAvailability}>
                    {remaining === null ? <strong className={styles.unlimitedAvailability}>人数制限なし</strong>
                      : isFull ? <strong className={styles.unlimitedAvailability}>満員</strong>
                      : <>あと<strong>{remaining}<span>人</span></strong><span>参加できます</span></>}
                  </p>
                  {isSample || (isFull && !isMember) ? <button type="button" className={styles.primary} disabled={isFull && !isMember}
                    aria-label={`${board.title}：${buttonLabel}`} onClick={() => setNoticeBoardId(board.id)}>
                    <ChatIcon />{buttonLabel}
                  </button> : <Link href={`/boards/${board.id}`} className={styles.primary} aria-label={`${board.title}：${buttonLabel}`}>
                    <ChatIcon />{buttonLabel}
                  </Link>}
                </div>
                {noticeBoardId === board.id && <p className={styles.joinNotice} role="status">
                  {isSample ? "サンプルのため参加申し込み・参加は行われません。" : "参加機能は準備中です。申し込みは行われていません。"}
                </p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
