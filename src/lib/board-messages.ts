import type { MessageSnapshot } from "../types/board.ts";
import { databaseError } from "./database-error.ts";

export function parseMessageSnapshot(value: unknown): MessageSnapshot {
  if (!value || typeof value !== "object") throw databaseError(null);
  const snapshot = value as Record<string, unknown>;
  if (!Array.isArray(snapshot.messages) || !Array.isArray(snapshot.deletedIds)) throw databaseError(null);
  const messages = snapshot.messages.map((item: unknown) => {
    if (!item || typeof item !== "object") throw databaseError(null);
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !/^\d+$/.test(row.id) || typeof row.boardId !== "string" || typeof row.authorId !== "string" || typeof row.authorName !== "string" || typeof row.content !== "string" || typeof row.createdAt !== "string" || (row.deletedAt !== null && typeof row.deletedAt !== "string") || typeof row.authorIsGuest !== "boolean") throw databaseError(null);
    if (row.replyToId != null && !isDatabaseId(row.replyToId)) throw databaseError(null);
    if (row.replyToAuthorName != null && typeof row.replyToAuthorName !== "string") throw databaseError(null);
    if (row.replyToContent != null && typeof row.replyToContent !== "string") throw databaseError(null);
    return { replyToContent: row.replyToContent as string | null | undefined, replyToId: row.replyToId as string | null | undefined, replyToAuthorName: row.replyToAuthorName as string | null | undefined, id: row.id, boardId: row.boardId, authorId: row.authorId, authorName: row.authorName, content: row.content, createdAt: row.createdAt, deletedAt: row.deletedAt, authorIsGuest: row.authorIsGuest };
  });
  const deletedIds = snapshot.deletedIds;
  if (!deletedIds.every((id: unknown) => typeof id === "string" && /^\d+$/.test(id))) throw databaseError(null);
  return { messages, deletedIds };
}

export function isDatabaseId(value: unknown): value is string {
  return typeof value === "string" && /^\d{1,19}$/.test(value) && BigInt(value) > BigInt(0) && BigInt(value) <= BigInt("9223372036854775807");
}
