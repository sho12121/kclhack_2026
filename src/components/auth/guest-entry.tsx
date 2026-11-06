import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/supabase/server";
import { startGuest } from "@/app/guest/actions";
import { GuestSubmit } from "@/app/guest/guest-submit";
import { AutoGuestStart } from "./auto-guest-start";

const errorMessages: Record<string, string> = {
  disabled: "ゲスト機能は準備中です。管理者による設定が必要です。",
  configuration: "ゲスト機能の接続設定が完了していません。",
  limit: "ゲスト利用が混み合っています。しばらく待ってからお試しください。",
  unavailable: "ゲスト利用を開始できませんでした。少し待ってからもう一度お試しください。",
};

export async function GuestEntry({ next, autoStart = false, errorCode }: {
  next: string; autoStart?: boolean; errorCode?: string;
}) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (configured) {
    const { data, error } = await getAuth();
    // QR入口では通常アカウントからゲストへ切り替える。既存ゲストは再利用する。
    if (!error && data?.claims.sub && (!autoStart || data.claims.is_anonymous === true)) redirect(next);
  }
  const failure = errorCode ?? (configured ? undefined : "configuration");
  const automatic = autoStart && !failure;
  return <section className="auth-card">
    <h1>{automatic ? "ゲスト利用を準備しています" : "ゲストでハナシネマを体験"}</h1>
    <p>{automatic ? "このまま自動で画面が開きます。" : "メールアドレス・パスワードの入力なしで、掲示板の作成・参加・会話ができます。"}</p>
    <form action={startGuest}>
      <input type="hidden" name="next" value={next}/>
      {autoStart && <input type="hidden" name="entry" value="qr"/>}
      <AutoGuestStart enabled={automatic}/>
      <GuestSubmit isJoining={next.startsWith("/boards/")} isBrowsing={next !== "/?create=1" && !next.startsWith("/boards/")}/>
      {failure && <p role="alert">{errorMessages[failure] ?? errorMessages.unavailable}</p>}
    </form>
    {automatic && <noscript><p>自動で開かない場合は、上のボタンを押してください。</p></noscript>}
    <p className="guest-note">ゲストの利用情報はこのブラウザで保持します。利用を終了したり、Cookieを削除したりすると、同じゲストとして戻れなくなります。</p>
    <p><Link href={`/login?${new URLSearchParams({next})}`}>アカウントでログイン</Link></p>
    <p><Link href="/">掲示板一覧を見る</Link></p>
  </section>;
}
