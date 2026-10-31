import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardMessage } from "../types/board.ts";
import { DatabaseError, databaseError } from "./database-error.ts";

export function memberMessagesQuery(supabase: SupabaseClient, boardId: string, userId: string, options: { after?: string; before?: string } = {}) {
  // 参加登録を起点に会話を一緒に取得する。会話側のRLSも引き続き適用される。
  let query = supabase.from("board_members")
    .select("board_id,boards!inner(messages(id::text,board_id,author_id,author_name,content,created_at))")
    .eq("board_id", boardId).eq("user_id", userId)
    .order("id", { referencedTable: "boards.messages", ascending: Boolean(options.after) })
    .limit(50, { referencedTable: "boards.messages" });
  if (options.after) query = query.gt("boards.messages.id", options.after);
  if (options.before) query = query.lt("boards.messages.id", options.before);
  return query.maybeSingle();
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function messagesFromMembership(value: unknown, ascending: boolean): BoardMessage[] {
  if (value === null) throw new DatabaseError("会話の閲覧には掲示板への参加が必要です。", 403);
  if (!record(value) || !record(value.boards) || !Array.isArray(value.boards.messages)) throw databaseError(null);
  const messages = value.boards.messages.map((row: unknown) => {
    if (!record(row) || typeof row.id !== "string" || typeof row.board_id !== "string" || typeof row.author_id !== "string" || typeof row.author_name !== "string" || typeof row.content !== "string" || typeof row.created_at !== "string") throw databaseError(null);
    return { id: row.id, boardId: row.board_id, authorId: row.author_id, authorName: row.author_name, content: row.content, createdAt: row.created_at };
  });
  return ascending ? messages : messages.reverse();
}
