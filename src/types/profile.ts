export type UserProfile = {
  id: string;
  nickname: string;
  bio: string;
  gender: string;
  birthDate: string;
  location: string;
  favoriteGenres: string;
  motto: string;
  avatarUrl?: string;
  coverUrl?: string;
  followCount: number;
  followerCount: number;
};

export type UserPost = {
  id: string;
  movieTitle: string;
  tag: string;
  title: string;
  content: string;
  commentCount: number;
  likeCount: number;
  date: string;
  posterBg: string;
};

export type FavoriteMovie = {
  id: string;
  title: string;
  posterBg: string;
};

export type ActivityItem = {
  id: string;
  iconBg: string;
  title: string;
  timeAgo: string;
};

