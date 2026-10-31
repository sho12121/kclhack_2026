import "server-only";
import { readDatabase } from "./database-read";
import { createClient, getAuth } from "@/lib/supabase/server";
import { DatabaseError, databaseError } from "./database-error";
import type { StoredBoard, BoardMessage } from "@/types/board";
import type { Movie } from "@/types/movie";
import { memberMessagesQuery, messagesFromMembership } from "./board-messages";

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
export async function listBoards(id?: string): Promise<StoredBoard[]> {
  const supabase = await createClient();
  const { data, error } = await readDatabase(() => supabase.rpc("cinema_list_boards", { p_board_id: id ?? null }));
  if (error) throw databaseError(error);
  if (!Array.isArray(data)) throw databaseError(null);
  return data.map((value: unknown) => {
    if (!record(value) || !isUuid(value.id) || typeof value.title !== "string" || !record(value.movie) || typeof value.movie.tmdbId !== "number" || typeof value.movie.title !== "string" || typeof value.starts_at !== "string" || typeof value.created_at !== "string") throw databaseError(null);
    const movie: Movie = {
      tmdbId: value.movie.tmdbId, title: value.movie.title,
      posterUrl: typeof value.movie.posterUrl === "string" ? value.movie.posterUrl : null,
      releaseDate: typeof value.movie.releaseDate === "string" ? value.movie.releaseDate : null,
      genres: Array.isArray(value.movie.genres) ? value.movie.genres.filter((g): g is string => typeof g === "string") : [],
    };
    return { id: value.id, title: value.title, movie, capacity: value.capacity === null ? null : Number(value.capacity), startsAt: value.starts_at, createdAt: value.created_at, participantCount: Number(value.participant_count), isMember: value.is_member === true, isOwner: value.is_owner === true };
  });
}

export async function getMessages(boardId: string, options: { after?: string; before?: string } = {}): Promise<BoardMessage[]> {
  const { supabase, data: claims, error: authError } = await getAuth();
  const userId = claims?.claims.sub;
  if (authError || !userId) throw new DatabaseError("ログインまたはゲスト利用を開始してください。", 401);
  const { data, error } = await readDatabase(() => memberMessagesQuery(supabase, boardId, userId, options));
  if (error) throw databaseError(error);
  return messagesFromMembership(data, Boolean(options.after));
}
