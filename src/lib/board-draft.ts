import type { BoardDraft } from "../types/board.ts";
import type { Movie } from "../types/movie.ts";

export const MAX_BOARD_TITLE_LENGTH = 80;
export const MIN_BOARD_CAPACITY = 2;
export const MAX_BOARD_CAPACITY = 20;

export type BoardDraftInput = {
  title: string;
  movie: Movie | null;
  capacity: string;
  startDateTime: string;
  allowGuests?: boolean;
  hasSpoilers?: boolean;
};

export function validateBoardStartDateTime(value: string, now = Date.now()): string | null {
  const timestamp = Date.parse(`${value}:00+09:00`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !Number.isFinite(timestamp)) {
    return "掲示板の開始日時を入力してください。";
  }
  const japanDateTime = new Date(timestamp + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
  if (japanDateTime !== value || timestamp <= now) {
    return "掲示板の開始日時には、未来の有効な日時を指定してください。";
  }
  return null;
}

/** datetime-localの値は端末の地域設定によらず、日本時間として解釈する。 */
export function validateBoardDraft(
  input: BoardDraftInput,
  now = Date.now(),
): { draft: BoardDraft; error: null } | { draft: null; error: string } {
  const title = input.title.trim();
  if (input.hasSpoilers !== undefined && typeof input.hasSpoilers !== "boolean") return { draft: null, error: "ネタバレ注意の設定を確認してください。" };
  if (input.allowGuests !== undefined && typeof input.allowGuests !== "boolean") return { draft: null, error: "ゲストの参加設定を確認してください。" };
  if (!title || title.length > MAX_BOARD_TITLE_LENGTH) {
    return { draft: null, error: `掲示板のタイトルを1〜${MAX_BOARD_TITLE_LENGTH}文字で入力してください。` };
  }
  if (!input.movie) {
    return { draft: null, error: "話したい映画を検索して選択してください。" };
  }

  const capacity = input.capacity === "unlimited" ? null : Number(input.capacity);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < MIN_BOARD_CAPACITY || capacity > MAX_BOARD_CAPACITY)) {
    return { draft: null, error: `定員は${MIN_BOARD_CAPACITY}〜${MAX_BOARD_CAPACITY}人で入力してください。` };
  }

  const dateError = validateBoardStartDateTime(input.startDateTime, now);
  if (dateError) return { draft: null, error: dateError };
  const timestamp = Date.parse(`${input.startDateTime}:00+09:00`);

  return {
    error: null,
    draft: { title, movie: input.movie, capacity, startsAt: new Date(timestamp).toISOString(), allowGuests: input.allowGuests ?? true, hasSpoilers: input.hasSpoilers ?? false },
  };
}

export function formatBoardDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short", hourCycle: "h23",
  }).format(new Date(value));
}

/** 選択日を基準に加減する。月末からの月移動は移動先の月末に合わせる。 */
export function shiftBoardDate(value: string, amount: number, unit: "days" | "months"): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isInteger(amount)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  if (unit === "days") date.setUTCDate(date.getUTCDate() + amount);
  else {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + amount);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
  }
  if (!Number.isFinite(date.getTime())) return null;
  const result = date.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}
