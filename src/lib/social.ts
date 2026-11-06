import "server-only";
import { getAuth } from "@/lib/supabase/server";
import { readDatabase } from "./database-read";
import { DatabaseError, databaseError } from "./database-error";
import { parsePublicProfile, parseInbox } from "./social-data";

async function authenticatedClient() {
  const auth = await getAuth();
  if (auth.error || !auth.data?.claims.sub) throw new DatabaseError("ログインまたはゲスト利用を開始してください。", 401);
  return auth.supabase;
}
export async function getPublicProfile(id: string) {
  const supabase = await authenticatedClient();
  const { data, error } = await readDatabase(() => supabase.rpc("cinema_public_profile", { p_user_id: id }));
  if (error) throw databaseError(error);
  return data === null ? null : parsePublicProfile(data);
}
export async function findProfiles(query = "", owner: string | null = null, relation: "following" | "followers" | null = null) {
  const supabase = await authenticatedClient();
  const { data, error } = await readDatabase(() => supabase.rpc("cinema_find_profiles", { p_query: query.slice(0,80).trim(), p_owner: owner, p_relation: relation }));
  if (error) throw databaseError(error);
  if (!Array.isArray(data)) throw databaseError(null);
  return data.map(parsePublicProfile);
}
export async function getNotifications(before?: string) {
  const supabase = await authenticatedClient();
  const { data, error } = await readDatabase(() => supabase.rpc("cinema_notifications", { p_before: before ?? null }));
  if (error) throw databaseError(error);
  return parseInbox(data);
}
