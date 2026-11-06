import type { BoardSummary } from "../types/board.ts";
import { isUuid } from "./social-data.ts";

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object"; }

/** 自動更新の応答が壊れていても、表示済みの一覧を置き換えない。 */
export function parseBoardList(value: unknown): BoardSummary[] {
  if (!record(value) || !Array.isArray(value.boards)) throw new Error("掲示板一覧の応答を確認できませんでした。");
  return value.boards.map((board: unknown) => {
    if (!record(board) || !isUuid(board.id) || typeof board.title !== "string" || !record(board.movie)
      || typeof board.movie.title !== "string" || !Number.isSafeInteger(board.movie.tmdbId) || Number(board.movie.tmdbId) <= 0
      || (board.movie.posterUrl !== null && typeof board.movie.posterUrl !== "string")
      || (board.movie.releaseDate !== null && typeof board.movie.releaseDate !== "string")
      || (board.movie.genres !== undefined && (!Array.isArray(board.movie.genres) || !board.movie.genres.every(genre => typeof genre === "string")))
      || (board.capacity !== null && (!Number.isSafeInteger(board.capacity) || Number(board.capacity) < 2))
      || !Number.isSafeInteger(board.participantCount) || Number(board.participantCount) < 0
      || typeof board.startsAt !== "string" || !Number.isFinite(Date.parse(board.startsAt))
      || typeof board.createdAt !== "string" || !Number.isFinite(Date.parse(board.createdAt))
      || typeof board.allowGuests !== "boolean" || typeof board.isMember !== "boolean" || typeof board.isFavorite !== "boolean") {
      throw new Error("掲示板一覧の応答を確認できませんでした。");
    }
    return {
      id: board.id, title: board.title,
      movie: { tmdbId: Number(board.movie.tmdbId), title: board.movie.title, posterUrl: board.movie.posterUrl, releaseDate: board.movie.releaseDate, genres: board.movie.genres as string[] | undefined },
      capacity: board.capacity === null ? null : Number(board.capacity), participantCount: Number(board.participantCount),
      startsAt: board.startsAt, createdAt: board.createdAt, allowGuests: board.allowGuests, isMember: board.isMember, isFavorite: board.isFavorite,
    };
  });
}
