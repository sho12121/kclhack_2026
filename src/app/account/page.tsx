import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/supabase/server";
import { AccountView } from "@/components/profile/account-view";
import { profileFromRow } from "@/lib/profile";
import { databaseError } from "@/lib/database-error";
import { readDatabase } from "@/lib/database-read";
import { formatBoardDate } from "@/lib/board-draft";
import type { UserPost } from "@/types/profile";
import { parsePublicProfile } from "@/lib/social-data";

export default async function AccountPage() {
  const { supabase, data: claims, error: authError } = await getAuth();
  const id = claims?.claims.sub;
  if (authError || !id || claims.claims.is_anonymous === true) redirect("/login?next=/account");
  const [{ data: row, error }, { data: messages, error: postsError }, follows] = await Promise.all([
    readDatabase(() => supabase.from("profiles").select("*").eq("id", id).maybeSingle()),
    readDatabase(() => supabase.from("messages")
      .select("id::text,board_id,content,created_at,boards(title,movie_title)")
      .eq("author_id", id).is("deleted_at", null).order("id", { ascending: false }).limit(50)),
    readDatabase(() => supabase.rpc("cinema_public_profile", { p_user_id: id })),
  ]);
  if (error) return <section className="auth-card"><h1>プロフィールを読み込めませんでした</h1><p role="alert">{databaseError(error).message}</p><Link href="/">掲示板一覧へ</Link></section>;
  // 旧プロフィールの表示補助には検証済みJWT内のmetadataを使い、Auth APIへの追加通信を省く。
  const metadata = claims.claims.user_metadata;
  const profile = profileFromRow(id, row, metadata && typeof metadata === "object" ? metadata : undefined);
  if (!follows.error && follows.data) {
    const publicProfile = parsePublicProfile(follows.data);
    profile.followCount = publicProfile.followCount;
    profile.followerCount = publicProfile.followerCount;
  }
  const posts: UserPost[] = (messages ?? []).map(value => {
    const board = Array.isArray(value.boards) ? value.boards[0] : value.boards;
    return { id: String(value.id), boardId: value.board_id, movieTitle: board?.movie_title ?? "映画", title: board?.title ?? "掲示板",
      tag: "会話への投稿", content: value.content, date: formatBoardDate(value.created_at), posterBg: "", commentCount: 0, likeCount: 0 };
  });
  return <AccountView initialProfile={profile} posts={posts} postsError={postsError ? databaseError(postsError).message : undefined} followError={follows.error ? databaseError(follows.error).message : undefined} />;
}
