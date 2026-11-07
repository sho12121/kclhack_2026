export type PublicProfile = {
  id: string; nickname: string; bio: string; favoriteGenres: string; motto: string;
  followCount: number; followerCount: number; isFollowing: boolean;
};
export type AppNotification = {
  id: string; kind: "follow" | "board_created" | "board_reply" | "board_deleted" | "board_invitation" | "comment_reply";
  actorId: string | null; actorName: string; boardId: string | null; boardTitle: string | null;
  filterEnabled?: boolean;
  messageId?: string | null; messagePreview?: string | null;
  createdAt: string; readAt: string | null;
};
export type NotificationInbox = { items: AppNotification[]; unreadCount: number };
