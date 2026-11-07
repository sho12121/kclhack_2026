"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMovieForBoard, MovieSearchError } from "@/lib/tmdb";
import { validateBoardDraft } from "@/lib/board-draft";
import { isUuid } from "@/lib/boards";
import { DatabaseError, databaseError } from "@/lib/database-error";
import type { BoardMessage } from "@/types/board";
import { filteredSnapshot } from "@/lib/message-filtering";
import { getMessageSnapshot } from "@/lib/boards";
import { isDatabaseId } from "@/lib/board-messages";

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) throw new DatabaseError("ログインまたはゲスト利用を開始してください。", 401);
  return { supabase, userId: data.claims.sub, isGuest: data.claims.is_anonymous === true };
}

function message(error: unknown) {
  return error instanceof DatabaseError || error instanceof MovieSearchError ? error.message : "保存できませんでした。時間をおいて再度お試しください。";
}

export async function createBoard(form: FormData): Promise<{ id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims.sub) return { error: "ログインまたはゲスト利用を開始してください。" };
    const title = form.get("title"), capacity = form.get("capacity"), startDateTime = form.get("startDateTime"), requestId = form.get("requestId");
    const tmdbId = Number(form.get("tmdbId"));
    const immediateSetting = form.get("startImmediately");
    if (immediateSetting !== "true" && immediateSetting !== "false") return { error: "開始方法を確認してください。" };
    const spoilerSetting = form.get("hasSpoilers");
    if (spoilerSetting !== "true" && spoilerSetting !== "false") return { error: "ネタバレ注意の設定を確認してください。" };
    const guestSetting = form.get("allowGuests");
    if (guestSetting !== "true" && guestSetting !== "false") return { error: "ゲストの参加設定を確認してください。" };
    if (guestSetting === "false" && data.claims.is_anonymous === true) return { error: "ゲストとして作成する場合は、ゲストユーザーの参加を受け入れてください。" };
    if (typeof title !== "string" || typeof capacity !== "string" || typeof startDateTime !== "string" || !isUuid(requestId) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0) return { error: "入力内容を確認してください。" };
    const input = validateBoardDraft({ title, capacity, startDateTime, allowGuests: guestSetting === "true", hasSpoilers: spoilerSetting === "true", startImmediately: immediateSetting === "true", movie: { tmdbId, title: "選択映画", releaseDate: null, posterUrl: null } });
    if (!input.draft) return { error: input.error };
    const inviteeIds = [...new Set(form.getAll("inviteeId"))];
    if (inviteeIds.length > 50 || inviteeIds.some(value => !isUuid(value))) return { error: "招待するユーザーを確認してください。最大50人まで選べます。" };
    if (inviteeIds.length && data.claims.is_anonymous === true) return { error: "招待にはアカウントでのログインが必要です。" };
    const movie = await getMovieForBoard(tmdbId);
    const { data: id, error: dbError } = await supabase.rpc("cinema_create_board_options", {
      p_request_id: requestId, p_title: input.draft.title, p_movie_tmdb_id: movie.tmdbId, p_movie_title: movie.title,
      p_movie_poster_url: movie.posterUrl, p_movie_release_date: movie.releaseDate,
      p_movie_genres: movie.genres ?? [], p_capacity: input.draft.capacity, p_starts_at: input.draft.startImmediately ? null : input.draft.startsAt,
      p_allow_guests: input.draft.allowGuests,
      p_invitee_ids: inviteeIds, p_has_spoilers: input.draft.hasSpoilers ?? false, p_start_immediately: input.draft.startImmediately ?? false,
    });
    if (dbError) throw databaseError(dbError);
    if (!isUuid(id)) throw databaseError(null);
    revalidatePath("/");
    revalidatePath("/account");
    return { id };
  } catch (error) { return { error: message(error) }; }
}

export async function joinBoard(id: string): Promise<{ error?: string }> {
  if (!isUuid(id)) return { error: "掲示板が見つかりません。" };
  try {
    const { supabase } = await authenticatedClient();
    const { error } = await supabase.rpc("cinema_join_board", { p_board_id: id });
    if (error) throw databaseError(error);
    revalidatePath("/"); revalidatePath(`/boards/${id}`);
    return {};
  } catch (error) { return { error: message(error) }; }
}

export async function postMessage(boardId: string, content: string, replyToId: string | null = null): Promise<{ error?: string; message?: BoardMessage; filterVersion?: string }> {
  if (replyToId !== null && !isDatabaseId(replyToId)) return { error: "返信先を確認してください。" };
  if (!isUuid(boardId) || typeof content !== "string" || !content.trim() || content.trim().length > 2000) return { error: "メッセージを1〜2000文字で入力してください。" };
  try {
    const { supabase } = await authenticatedClient();
    const { data, error } = await supabase.rpc("cinema_post_message_result", { p_board_id: boardId, p_content: content.trim(), p_reply_to_id: replyToId });
    if (error) throw databaseError(error);
    const snapshot = filteredSnapshot(data);
    const postedId = data && typeof data === "object" ? data.postedId : null;
    const saved = snapshot.messages.find(message=>message.id===postedId);
    if (!saved) throw databaseError(null);
    return { message: saved, filterVersion: snapshot.filterVersion };
  } catch (error) { return { error: message(error) }; }
}

export async function deleteComment(id: string): Promise<{ error?: string }> {
  if (!isDatabaseId(id)) return { error: "コメントが見つかりません。" };
  try {
    const { supabase } = await authenticatedClient();
    const { error } = await supabase.rpc("cinema_delete_message", { p_message_id: id });
    if (error) throw databaseError(error);
    return {};
  } catch (error) { return { error: message(error) }; }
}

export async function deleteBoard(id: string): Promise<{ error?: string }> {
  if (!isUuid(id)) return { error: "掲示板が見つかりません。" };
  try {
    const { supabase } = await authenticatedClient();
    const { error } = await supabase.rpc("cinema_delete_board", { p_board_id: id });
    if (error) throw databaseError(error);
  } catch (error) { return { error: message(error) }; }
  revalidatePath("/");
  redirect("/");
}

export async function setBoardFavorite(boardId: string, favorite: boolean): Promise<{ error?: string }> {
  if (!isUuid(boardId) || typeof favorite !== "boolean") return { error: "掲示板を確認してください。" };
  try {
    const { supabase, isGuest } = await authenticatedClient();
    if (isGuest) return { error: "お気に入りにはアカウントでのログインが必要です。" };
    const { error } = await supabase.rpc("cinema_set_board_favorite", { p_board_id: boardId, p_favorite: favorite });
    if (error) throw databaseError(error);
    revalidatePath("/account");
    revalidatePath("/");
    revalidatePath(`/boards/${boardId}`);
    return {};
  } catch (error) { return { error: message(error) }; }
}

export async function setBoardFilter(boardId: string, enabled: boolean) {
  if (!isUuid(boardId) || typeof enabled !== "boolean") return { error: "設定を確認してください。" };
  try {
    const { supabase } = await authenticatedClient();
    const { error } = await supabase.rpc("cinema_set_board_filter", { p_board_id: boardId, p_enabled: enabled });
    if (error) throw databaseError(error);
    return { snapshot: await getMessageSnapshot(boardId) };
  } catch (error) { return { error: message(error) }; }
}
