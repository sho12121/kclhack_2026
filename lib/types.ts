export type BoardStatus = "recruiting" | "full" | "active" | "finished";
export type Visibility = "private" | "public";
export type User = { id: string; name: string; email: string; createdAt: string };
export type Movie = { id: string; externalId: string; title: string; posterUrl?: string; releaseDate: string };
export type BoardMember = { id: string; userId: string; joinedAt: string };
export type Message = { id: string; boardId: string; userId: string; content: string; createdAt: string };
export type Board = { id: string; movieId: string; hostUserId: string; startAt: string; capacity: number; visibility: Visibility; description: string; createdAt: string; members: BoardMember[]; messages: Message[] };
export type BoardWithDetails = Board & { movie: Movie; host: User; participants: User[]; status: BoardStatus };
