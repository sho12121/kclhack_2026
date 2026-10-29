import type { BoardSummary } from "@/types/board";
import { formatBoardDate } from "@/lib/board-draft";
import styles from "./boards.module.css";

export function BoardList({ boards }: { boards: BoardSummary[] }) {
  return (
    <section aria-labelledby="board-list-title">
      <h2 id="board-list-title">掲示板一覧</h2>
      {boards.length === 0 ? (
        <div className={styles.empty}>
          <h3>まだ掲示板はありません</h3>
          <p>話したい映画を選んで、掲示板の作成内容を考えてみましょう。</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {boards.map((board) => (
            <li key={board.id} className={styles.panel}>
              <h3>{board.title}</h3>
              <p>映画：{board.movie.title}</p>
              <p>定員：{board.capacity}人（作成者を含む）</p>
              <p>終了日時：<time dateTime={board.endsAt}>{formatBoardDate(board.endsAt)}（日本時間）</time></p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
