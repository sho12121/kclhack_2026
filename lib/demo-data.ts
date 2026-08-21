import type { Board, Movie, User } from "./types";
export const currentUser: User = { id: "user-me", name: "映画好きのミナ", email: "mina@example.com", createdAt: "2026-08-01T00:00:00Z" };
export const users: User[] = [currentUser, { id: "user-a", name: "ユウ", email: "yu@example.com", createdAt: "2026-08-01T00:00:00Z" }, { id: "user-b", name: "アキ", email: "aki@example.com", createdAt: "2026-08-01T00:00:00Z" }];
export const movies: Movie[] = [{ id: "movie-1", externalId: "demo-001", title: "君の名は。", releaseDate: "2016-08-26" }, { id: "movie-2", externalId: "demo-002", title: "リトル・ミス・サンシャイン", releaseDate: "2006-07-26" }, { id: "movie-3", externalId: "demo-003", title: "花束みたいな恋をした", releaseDate: "2021-01-29" }, { id: "movie-4", externalId: "demo-004", title: "パスト ライブス／再会", releaseDate: "2023-06-02" }];
export const initialBoards: Board[] = [
  { id: "board-1", movieId: "movie-1", hostUserId: "user-a", startAt: "2026-08-25T21:00", capacity: 4, visibility: "private", description: "ラストシーンを中心に、入れ替わりが二人の人生に残したものをゆっくり話したいです。初見でも見終わったばかりでも歓迎します。", createdAt: "2026-08-20T09:00", members: [{ id: "m-1", userId: "user-a", joinedAt: "2026-08-20T09:00" }, { id: "m-2", userId: "user-b", joinedAt: "2026-08-20T11:00" }], messages: [] },
  { id: "board-2", movieId: "movie-3", hostUserId: "user-b", startAt: "2026-08-27T20:30", capacity: 3, visibility: "private", description: "麦と絹がすれ違っていく場面について語りたいです。二人の選択に共感したところ、違和感があったところを聞かせてください。", createdAt: "2026-08-20T10:00", members: [{ id: "m-3", userId: "user-b", joinedAt: "2026-08-20T10:00" }], messages: [] },
];
