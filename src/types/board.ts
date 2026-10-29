import type { Movie } from "./movie";

/** 今回は入力内容の確認まで。DBに保存するIDはまだ持たない。 */
export type BoardDraft = {
  title: string;
  movie: Movie;
  capacity: number;
  endsAt: string;
};

/** 一覧で公開する募集情報。会話の本文は含めない。 */
export type BoardSummary = BoardDraft & { id: string };
