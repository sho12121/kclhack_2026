import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startGuest } from "./actions";
import { GuestSubmit } from "./guest-submit";
import { safeAuthRedirect } from "@/lib/auth-redirect";

const errorMessages: Record<string, string> = {
  disabled: "ゲスト機能は準備中です。管理者による設定が必要です。",
  configuration: "ゲスト機能の接続設定が完了していません。",
  limit: "ゲスト利用が混み合っています。しばらく待ってからお試しください。",
  unavailable: "ゲスト利用を開始できませんでした。少し待ってからもう一度お試しください。",
};

export default async function GuestPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeAuthRedirect(params.next, "/?create=1");
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (!error && data?.claims.sub) redirect(next);
  }
  const { error } = params;
  return <section className="auth-card">
    <h1>ゲストでハナシネマを体験</h1>
    <p>メールアドレス・パスワードの入力なしで、掲示板の作成・参加・会話ができます。</p>
    <form action={startGuest}>
      <input type="hidden" name="next" value={next} />
      <GuestSubmit isJoining={next.startsWith("/boards/")} />
      {typeof error === "string" && <p role="alert">{errorMessages[error] ?? errorMessages.unavailable}</p>}
    </form>
    <p className="guest-note">ゲストの利用情報はこのブラウザで保持します。利用を終了したり、Cookieを削除したりすると、同じゲストとして戻れなくなります。</p>
    <p><Link href={`/login?${new URLSearchParams({ next })}`}>アカウントでログイン</Link></p>
    <p><Link href="/">掲示板一覧を見る</Link></p>
  </section>;
}
