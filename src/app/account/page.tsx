import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { ProfileView } from "@/components/profile/profile-view";

export default async function AccountPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims(); //トークンを検証し、利用者のIDを取り出す
  const userId = data?.claims.sub;

  if (error || !userId) {
    redirect("/login?next=/account");
  }

  return (
    <>
      {/* DB接続前のため未設定で表示。接続後は取得したプロフィールを渡す。 */}
      <ProfileView profile={null} />
      <form action={logout}>
        <button type="submit">ログアウト</button>
      </form>
    </>
  );
}
