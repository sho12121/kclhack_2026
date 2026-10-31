"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMovieForBoard, MovieSearchError } from "@/lib/tmdb";
import { validateBoardDraft } from "@/lib/board-draft";
import { isUuid } from "@/lib/boards";
import { DatabaseError, databaseError } from "@/lib/database-error";
import type { BoardMessage } from "@/types/board";

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) throw new DatabaseError("ログインまたはゲスト利用を開始してください。", 401);
  return { supabase, userId: data.claims.sub };
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
    if (typeof title !== "string" || typeof capacity !== "string" || typeof startDateTime !== "string" || !isUuid(requestId) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0) return { error: "入力内容を確認してください。" };
    const input = validateBoardDraft({ title, capacity, startDateTime, movie: { tmdbId, title: "選択映画", releaseDate: null, posterUrl: null } });
    if (!input.draft) return { error: input.error };
    const movie = await getMovieForBoard(tmdbId);
    const { data: id, error: dbError } = await supabase.rpc("cinema_create_board", {
      p_request_id: requestId, p_title: input.draft.title, p_movie_tmdb_id: movie.tmdbId, p_movie_title: movie.title,
      p_movie_poster_url: movie.posterUrl, p_movie_release_date: movie.releaseDate,
      p_movie_genres: movie.genres ?? [], p_capacity: input.draft.capacity, p_starts_at: input.draft.startsAt,
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

export async function postMessage(boardId: string, content: string): Promise<{ error?: string; message?: BoardMessage }> {
  if (!isUuid(boardId) || typeof content !== "string" || !content.trim() || content.trim().length > 2000) return { error: "メッセージを1〜2000文字で入力してください。" };
  try {
    const { supabase, userId } = await authenticatedClient();
    const { data: id, error } = await supabase.rpc("cinema_post_message", { p_board_id: boardId, p_content: content.trim() });
    if (error) throw databaseError(error);
    // 会話はローカルに追加し、プロフィールの履歴はページを開いた時にDBから読む。
    // ここでrevalidatePathすると、投稿のたびに現在の掲示板全体も再取得されてしまう。
    // DBで保存を確認してから自分の画面に反映する。次回取得で正式な名前・投稿日時に置き換わる。
    return typeof id === "string" && /^\d+$/.test(id) ? {
      message: { id, boardId, authorId: userId, authorName: "あなた", content: content.trim(), createdAt: new Date().toISOString() },
    } : {};
  } catch (error) { return { error: message(error) }; }
}
