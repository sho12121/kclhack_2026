import type { Movie } from "./movie";

/** 今回は入力内容の確認まで。DBに保存するIDはまだ持たない。 */
export type BoardDraft = {
  title: string;
  movie: Movie;
  capacity: number | null; // nullは定員の制限なし。
  startsAt: string;
};

/** 一覧で公開する募集情報。会話の本文は含めない。 */
export type BoardSummary = BoardDraft & { id: string; participantCount: number; createdAt: string; isMember?: boolean };

export type StoredBoard = BoardSummary & { isMember: boolean; isOwner: boolean };
export type BoardMessage = { id: string; boardId: string; authorId: string; authorName: string; content: string; createdAt: string; isMember?: boolean };
