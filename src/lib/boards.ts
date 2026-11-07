import "server-only";
import { readDatabase } from "./database-read";
import { createClient, getAuth } from "@/lib/supabase/server";
import { DatabaseError, databaseError } from "./database-error";
import type { StoredBoard, MessageSnapshot } from "@/types/board";
import type { Movie } from "@/types/movie";
import { filteredSnapshot } from "./message-filtering";

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
export async function listBoards(id?: string): Promise<StoredBoard[]> {
  const supabase = await createClient();
  // 募集情報と本人のお気に入りは互いを待たずに取得する。
  const favoritesPromise = (async () => {
    const auth = await getAuth();
    const ids = new Set<string>();
    if (!auth.error && auth.data?.claims.sub && auth.data.claims.is_anonymous !== true) {
      const favorites = await readDatabase(() => supabase.from("board_favorites").select("board_id").eq("user_id", auth.data!.claims.sub));
      if (favorites.error) throw databaseError(favorites.error);
      for (const favorite of favorites.data ?? []) ids.add(favorite.board_id);
    }
    return ids;
  })();
  const [{ data, error }, favoriteIds] = await Promise.all([
    readDatabase(() => supabase.rpc("cinema_list_boards_with_labels", { p_board_id: id ?? null })),
    favoritesPromise,
  ]);
  if (error) throw databaseError(error);
  if (!Array.isArray(data)) throw databaseError(null);
  return data.map((value: unknown) => {
    if (!record(value) || !isUuid(value.id) || typeof value.title !== "string" || !record(value.movie) || typeof value.movie.tmdbId !== "number" || typeof value.movie.title !== "string" || typeof value.starts_at !== "string" || typeof value.created_at !== "string") throw databaseError(null);
    if (typeof value.allow_guests !== "boolean" || !isUuid(value.created_by) || typeof value.creator_name !== "string" || typeof value.creator_is_guest !== "boolean") throw databaseError({code:"42703"});
    const movie: Movie = {
      tmdbId: value.movie.tmdbId, title: value.movie.title,
      posterUrl: typeof value.movie.posterUrl === "string" ? value.movie.posterUrl : null,
      releaseDate: typeof value.movie.releaseDate === "string" ? value.movie.releaseDate : null,
      genres: Array.isArray(value.movie.genres) ? value.movie.genres.filter((g): g is string => typeof g === "string") : [],
    };
    return { filterEnabled: value.filter_enabled === true, filterVersion: typeof value.filter_version === "string" ? value.filter_version : "0", hasSpoilers: value.has_spoilers === true, isFavorite: favoriteIds.has(value.id), id: value.id, title: value.title, movie, capacity: value.capacity === null ? null : Number(value.capacity), startsAt: value.starts_at, createdAt: value.created_at, participantCount: Number(value.participant_count), allowGuests: value.allow_guests, ownerId: value.created_by, ownerName: value.creator_name, ownerIsGuest: value.creator_is_guest, isMember: value.is_member === true, isOwner: value.is_owner === true };
  });
}

export async function getMessageSnapshot(boardId: string, options: { after?: string; before?: string; visibleAfter?: string } = {}): Promise<MessageSnapshot> {
  const { supabase, data: claims, error: authError } = await getAuth();
  if (authError || !claims?.claims.sub) throw new DatabaseError("ログインまたはゲスト利用を開始してください。", 401);
  const { data, error } = await readDatabase(() => supabase.rpc("cinema_get_messages", {
    p_board_id: boardId, p_after: options.after ?? null, p_before: options.before ?? null, p_visible_after: options.visibleAfter ?? null,
  }));
  if (error) throw databaseError(error);
  return filteredSnapshot(data);
}

export async function getMessageContext(boardId: string, messageId: string): Promise<MessageSnapshot> {
  const { supabase, data, error: authError } = await getAuth();
  if (authError || !data?.claims.sub) throw new DatabaseError("ログインしてください。", 401);
  const { data: snapshot, error } = await readDatabase(() => supabase.rpc("cinema_get_message_context", { p_board_id: boardId, p_message_id: messageId }));
  if (error) throw databaseError(error);
  return filteredSnapshot(snapshot);
}
