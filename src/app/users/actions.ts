"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DatabaseError, databaseError } from "@/lib/database-error";
import { isUuid } from "@/lib/social-data";

export async function setFollow(id: string, following: boolean): Promise<{ error?: string }> {
  if (!isUuid(id) || typeof following !== "boolean") return { error: "フォローの設定を確認してください。" };
  try {
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.getClaims();
    if (authError || !data?.claims.sub) return { error: "ログインしてください。" };
    if (data.claims.is_anonymous === true) return { error: "フォローには通常アカウントでのログインが必要です。" };
    const { error } = await supabase.rpc("cinema_set_follow", { p_user_id: id, p_follow: following });
    if (error) throw databaseError(error);
    revalidatePath(`/users/${id}`);
    return {};
  } catch (error) { return { error: error instanceof DatabaseError ? error.message : "フォローを変更できませんでした。" }; }
}
