import { getAuth } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/social";
import { DatabaseError, databaseError } from "@/lib/database-error";
import { readDatabase } from "@/lib/database-read";
import { isDatabaseId } from "@/lib/board-messages";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const query = new URL(request.url).searchParams;
  const before = query.get("before") ?? undefined;
  if (before && !isDatabaseId(before)) return Response.json({ error: "取得条件を確認してください。" }, { status: 400, headers });
  try {
    if (query.get("count") === "1") {
      const { supabase, data, error } = await getAuth();
      if (error || !data?.claims.sub) throw new DatabaseError("ログインしてください。", 401);
      const result = await readDatabase(() => supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", data.claims.sub).is("read_at", null));
      if (result.error) throw databaseError(result.error);
      return Response.json({ unreadCount: result.count ?? 0 }, { headers });
    }
    return Response.json(await getNotifications(before), { headers });
  } catch (error) { return Response.json({ error: error instanceof DatabaseError ? error.message : "通知を取得できませんでした。" }, { status: error instanceof DatabaseError ? error.status : 502, headers }); }
}
