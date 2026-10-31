import { getMessages, isUuid } from "@/lib/boards";
import { DatabaseError } from "@/lib/database-error";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const after = query.get("after") ?? undefined, before = query.get("before") ?? undefined;
  const headers = { "Cache-Control": "private, no-store" };
  if (!isUuid(id) || (after && before) || [after, before].some(value => value !== undefined && (!/^\d{1,19}$/.test(value) || BigInt(value) > BigInt("9223372036854775807")))) {
    return Response.json({ error: "取得条件が正しくありません。" }, { status: 400, headers });
  }
  try { return Response.json({ messages: await getMessages(id, { after, before }) }, { headers }); }
  catch (error) { return Response.json({ error: error instanceof DatabaseError ? error.message : "会話を取得できませんでした。" }, { status: error instanceof DatabaseError ? error.status : 502, headers }); }
}
