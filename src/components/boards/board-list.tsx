import type { BoardSummary } from "@/types/board";
import { formatBoardDate } from "@/lib/board-draft";
import { CalendarIcon, ChatIcon, FilmIcon, UsersIcon } from "@/components/ui/icons";
import styles from "./boards.module.css";

export function BoardList({ boards }: { boards: BoardSummary[] }) {
  return (
    <section aria-labelledby="board-list-title">
      <div className={styles.listHeading}>
        <h2 id="board-list-title"><ChatIcon />掲示板一覧</h2>
        <span>{boards.length}件</span>
      </div>
      {boards.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true"><ChatIcon /></span>
          <h3>まだ掲示板はありません</h3>
          <p>あなたが語りたい映画は何ですか？<br />「掲示板を作成する」から、最初の会話を考えてみましょう。</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {boards.map((board) => (
            <li key={board.id} className={styles.panel}>
              <h3>{board.title}</h3>
              <p className={styles.boardMovie}><FilmIcon />{board.movie.title}</p>
              <div className={styles.boardMeta}>
                <span><UsersIcon />定員 {board.capacity}人（作成者を含む）</span>
                <span><CalendarIcon /><time dateTime={board.endsAt}>{formatBoardDate(board.endsAt)} 終了（日本時間）</time></span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
