"use server";
import { createClient } from "@/lib/supabase/server";
import { DatabaseError, databaseError } from "@/lib/database-error";
import { isDatabaseId } from "@/lib/board-messages";
export async function markNotificationsRead(ids?: string[]): Promise<{ error?: string }> {
  if (ids !== undefined && (!Array.isArray(ids) || ids.length > 100 || ids.some(id => !isDatabaseId(id)))) return { error: "通知の指定を確認してください。" };
  try {
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.getClaims();
    if (authError || !data?.claims.sub) return { error: "ログインしてください。" };
    const { error } = await supabase.rpc("cinema_read_notifications", { p_ids: ids ?? null });
    if (error) throw databaseError(error);
    return {};
  } catch (error) { return { error: error instanceof DatabaseError ? error.message : "通知を更新できませんでした。" }; }
}
