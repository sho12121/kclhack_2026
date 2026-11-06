import { listBoards } from "@/lib/boards";
import { DatabaseError } from "@/lib/database-error";

export async function GET() {
  // 参加・お気に入りの状態を含むため、ブラウザ間で応答を共有しない。
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const boards = (await listBoards()).map(({ id, title, movie, capacity, startsAt, allowGuests, participantCount, createdAt, isMember, isFavorite }) =>
      ({ id, title, movie, capacity, startsAt, allowGuests, participantCount, createdAt, isMember, isFavorite }));
    return Response.json({ boards }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof DatabaseError ? error.message : "掲示板一覧を取得できませんでした。" }, { status: error instanceof DatabaseError ? error.status : 502, headers });
  }
}
