import { getMessageSnapshot, getMessageContext, isUuid } from "@/lib/boards";
import { isDatabaseId } from "@/lib/board-messages";
import { DatabaseError } from "@/lib/database-error";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const after = query.get("after") ?? undefined, before = query.get("before") ?? undefined;
  const visibleAfter = query.get("visible_after") ?? undefined;
  const target = query.get("target");
  const headers = { "Cache-Control": "private, no-store" };
  if ((target !== null && (!isDatabaseId(target) || after || before || visibleAfter)) || !isUuid(id) || (after && before) || [after, before, visibleAfter].some(value => value !== undefined && (!/^\d{1,19}$/.test(value) || BigInt(value) > BigInt("9223372036854775807")))) {
    return Response.json({ error: "取得条件が正しくありません。" }, { status: 400, headers });
  }
  try { return Response.json(target ? await getMessageContext(id, target) : await getMessageSnapshot(id, { after, before, visibleAfter }), { headers }); }
  catch (error) { return Response.json({ error: error instanceof DatabaseError ? error.message : "会話を取得できませんでした。" }, { status: error instanceof DatabaseError ? error.status : 502, headers }); }
}
