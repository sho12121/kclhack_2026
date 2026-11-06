import type { PublicProfile, AppNotification, NotificationInbox } from "../types/social.ts";
import { databaseError } from "./database-error.ts";
import { isDatabaseId } from "./board-messages.ts";

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function count(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
export function parsePublicProfile(value: unknown): PublicProfile {
  if (!record(value) || !isUuid(value.id) || typeof value.nickname !== "string" || typeof value.bio !== "string" || typeof value.favoriteGenres !== "string" || typeof value.motto !== "string" || !count(value.followCount) || !count(value.followerCount) || typeof value.isFollowing !== "boolean") throw databaseError(null);
  // 予期しない追加項目があってもクライアントへ渡さない。
  return { id: value.id, nickname: value.nickname, bio: value.bio, favoriteGenres: value.favoriteGenres, motto: value.motto, followCount: value.followCount, followerCount: value.followerCount, isFollowing: value.isFollowing };
}
export function parseInbox(value: unknown): NotificationInbox {
  if (!record(value) || !Array.isArray(value.items) || !count(value.unreadCount)) throw databaseError(null);
  const items = value.items.map((item: unknown): AppNotification => {
    if (!record(item) || !isDatabaseId(item.id) || !["follow", "board_created", "board_reply", "board_deleted", "board_invitation", "comment_reply"].includes(String(item.kind)) || (item.actorId !== null && !isUuid(item.actorId)) || (item.boardId !== null && !isUuid(item.boardId)) || typeof item.actorName !== "string" || (item.boardTitle !== null && typeof item.boardTitle !== "string") || typeof item.createdAt !== "string" || (item.readAt !== null && typeof item.readAt !== "string")) throw databaseError(null);
    if (item.messageId != null && !isDatabaseId(item.messageId)) throw databaseError(null);
    if (item.messagePreview != null && typeof item.messagePreview !== "string") throw databaseError(null);
    return { messageId: item.messageId as string | null | undefined, messagePreview: item.messagePreview as string | null | undefined, id: item.id, kind: item.kind as AppNotification["kind"], actorId: item.actorId, actorName: item.actorName, boardId: item.boardId, boardTitle: item.boardTitle, createdAt: item.createdAt, readAt: item.readAt };
  });
  return { items, unreadCount: value.unreadCount };
}
