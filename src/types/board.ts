import type { Movie } from "./movie";

/** 作成時の入力内容。 */
export type BoardDraft = {
  title: string;
  movie: Movie;
  capacity: number | null; // nullは定員の制限なし。
  startsAt: string;
  allowGuests: boolean;
};

/** 一覧で公開する募集情報。会話の本文は含めない。 */
export type BoardSummary = BoardDraft & { id: string; participantCount: number; createdAt: string; isMember?: boolean; isFavorite?: boolean };

export type StoredBoard = BoardSummary & { isMember: boolean; isOwner: boolean; ownerId: string; ownerName: string; ownerIsGuest: boolean };
export type BoardMessage = { id: string; boardId: string; authorId: string; authorName: string; content: string; createdAt: string; deletedAt?: string | null; authorIsGuest?: boolean; replyToId?: string | null; replyToAuthorName?: string | null; replyToContent?: string | null };
export type MessageSnapshot = { messages: BoardMessage[]; deletedIds: string[] };
