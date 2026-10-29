import type { BoardDraft } from "../types/board.ts";
import type { Movie } from "../types/movie.ts";

export const MAX_BOARD_TITLE_LENGTH = 80;
export const MIN_BOARD_CAPACITY = 2;
export const MAX_BOARD_CAPACITY = 20;

export type BoardDraftInput = {
  title: string;
  movie: Movie | null;
  capacity: string;
  endDateTime: string;
};

/** datetime-localの値は端末の地域設定によらず、日本時間として解釈する。 */
export function validateBoardDraft(
  input: BoardDraftInput,
  now = Date.now(),
): { draft: BoardDraft; error: null } | { draft: null; error: string } {
  const title = input.title.trim();
  if (!title || title.length > MAX_BOARD_TITLE_LENGTH) {
    return { draft: null, error: `掲示板のタイトルを1〜${MAX_BOARD_TITLE_LENGTH}文字で入力してください。` };
  }
  if (!input.movie) {
    return { draft: null, error: "話したい映画を検索して選択してください。" };
  }

  const capacity = Number(input.capacity);
  if (!Number.isInteger(capacity) || capacity < MIN_BOARD_CAPACITY || capacity > MAX_BOARD_CAPACITY) {
    return { draft: null, error: `定員は${MIN_BOARD_CAPACITY}〜${MAX_BOARD_CAPACITY}人で入力してください。` };
  }

  const timestamp = Date.parse(`${input.endDateTime}:00+09:00`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.endDateTime) || !Number.isFinite(timestamp)) {
    return { draft: null, error: "掲示板の終了日時を入力してください。" };
  }
  // 2月30日など、Dateが自動補正する存在しない日時も拒否する。
  const japanDateTime = new Date(timestamp + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
  if (japanDateTime !== input.endDateTime || timestamp <= now) {
    return { draft: null, error: "掲示板の終了日時には、未来の有効な日時を指定してください。" };
  }

  return {
    error: null,
    draft: { title, movie: input.movie, capacity, endsAt: new Date(timestamp).toISOString() },
  };
}

export function formatBoardDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short", hourCycle: "h23",
  }).format(new Date(value));
}
