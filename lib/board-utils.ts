import type { Board, BoardStatus } from "./types";
export function boardStatus(board: Board, now = new Date()): BoardStatus { const start = new Date(board.startAt); if (now >= new Date(start.getTime() + 7200000)) return "finished"; if (now >= start) return "active"; return board.members.length >= board.capacity ? "full" : "recruiting"; }
export function formatDateTime(value: string) { return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
export const statusLabel: Record<BoardStatus, string> = { recruiting: "募集中", full: "満員", active: "開催中", finished: "終了" };
