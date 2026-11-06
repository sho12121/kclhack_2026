import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/supabase/server";
import { AccountView } from "@/components/profile/account-view";
import { profileFromRow } from "@/lib/profile";
import { databaseError } from "@/lib/database-error";
import { readDatabase } from "@/lib/database-read";
import { listBoards } from "@/lib/boards";
import { parsePublicProfile } from "@/lib/social-data";

export default async function AccountPage() {
  const { supabase, data: claims, error: authError } = await getAuth();
  const id = claims?.claims.sub;
  if (authError || !id || claims.claims.is_anonymous === true) redirect("/login?next=/account");
  const [{ data: row, error }, follows, userNumber, boardResult] = await Promise.all([
    readDatabase(() => supabase.from("profiles").select("*").eq("id", id).maybeSingle()),
    readDatabase(() => supabase.rpc("cinema_public_profile", { p_user_id: id })),
    readDatabase(() => supabase.from("cinema_user_numbers").select("number::text").eq("user_id", id).maybeSingle()),
    listBoards().then(boards => ({ boards, error: "" })).catch(error => ({ boards: [], error: error instanceof Error ? error.message : "掲示板を取得できませんでした。" })),
  ]);
  if (error) return <section className="auth-card"><h1>プロフィールを読み込めませんでした</h1><p role="alert">{databaseError(error).message}</p><Link href="/">掲示板一覧へ</Link></section>;
  // 旧プロフィールの表示補助には検証済みJWT内のmetadataを使い、Auth APIへの追加通信を省く。
  const metadata = claims.claims.user_metadata;
  const profile = profileFromRow(id, row, metadata && typeof metadata === "object" ? metadata : undefined);
  if (!userNumber.error && typeof userNumber.data?.number === "string") profile.userNumber = userNumber.data.number;
  if (!follows.error && follows.data) {
    const publicProfile = parsePublicProfile(follows.data);
    profile.followCount = publicProfile.followCount;
    profile.followerCount = publicProfile.followerCount;
  }
  return <AccountView initialProfile={profile} favoriteBoards={boardResult.boards.filter(board => board.isFavorite)} favoritesError={boardResult.error} createdBoards={boardResult.boards.filter(board => board.ownerId === id)} boardsError={boardResult.error} followError={follows.error ? databaseError(follows.error).message : undefined} />;
}
