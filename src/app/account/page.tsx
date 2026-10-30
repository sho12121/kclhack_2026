import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountView } from "@/components/profile/account-view";
import { UserProfile } from "@/types/profile";

export default async function AccountPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    redirect("/login?next=/account");
  }

  // 1. Supabase Authからユーザー情報とメタデータを取得
  const { data: authData } = await supabase.auth.getUser();
  const metadata = authData?.user?.user_metadata || {};

  // 2. profilesテーブルからの取得を試みる（テーブル作成済みの場合に連携）
  let dbProfile: Record<string, string | number | null | undefined> | null = null;
  try {
    const { data: profileRecord } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    dbProfile = profileRecord as Record<string, string | number | null | undefined> | null;
  } catch {
    // profilesテーブル未作成や通信エラー時はmetadataおよびデフォルト値へフォールバック
    dbProfile = null;
  }

  // 3. プロフィール初期値を組み立て（DB値 > Auth metadata > 画像の初期デザイン値）
  const initialProfile: UserProfile = {
    id: userId,
    nickname:
      dbProfile?.nickname ||
      dbProfile?.display_name ||
      metadata.nickname ||
      metadata.displayName ||
      "たかし",
    bio:
      dbProfile?.bio ||
      metadata.bio ||
      "映画で人生をちょっと豊かに。\n邦画も洋画も好きです。特に人間ドラマや青春映画が好きです。\n最近は、映画をきっかけにいろんな人と話してみたいと思っています。\nよろしくお願いします！",
    gender:
      dbProfile?.gender ||
      metadata.gender ||
      "男性",
    birthDate:
      dbProfile?.birth_date ||
      metadata.birthDate ||
      "2005/04/12",
    location:
      dbProfile?.location ||
      metadata.location ||
      "福岡",
    favoriteGenres:
      dbProfile?.favorite_genres ||
      metadata.favoriteGenres ||
      "邦画 / 洋画 / アニメ / ドラマ",
    motto:
      dbProfile?.motto ||
      metadata.motto ||
      "映画で出会った感動を誰かと共有したいです！",
    avatarUrl: dbProfile?.avatar_url || metadata.avatarUrl,
    coverUrl: dbProfile?.cover_url || metadata.coverUrl,
    followCount:
      typeof dbProfile?.follow_count === "number"
        ? dbProfile.follow_count
        : typeof metadata.followCount === "number"
        ? metadata.followCount
        : 32,
    followerCount:
      typeof dbProfile?.follower_count === "number"
        ? dbProfile.follower_count
        : typeof metadata.followerCount === "number"
        ? metadata.followerCount
        : 48,
  };

  return <AccountView initialProfile={initialProfile} />;
}
