"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type SignupState } from "./actions";

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {});
  const loginUrl = `/login?${new URLSearchParams({ next })}`;
  if (state.confirmationRequired) return <div role="status">
    <h2>メールをご確認ください</h2>
    <p>登録手続きの結果をメールでご確認ください。確認リンクを開いてからログインできます。</p>
    <p className="guest-note">届かない場合は迷惑メールフォルダをご確認ください。登録済みのアドレスの場合は、そのままログインしてください。</p>
    <Link className="guest-account-button" href={loginUrl}>ログイン画面へ</Link>
  </div>;
  return <>
    <p>メールアドレスとパスワードで登録します。プロフィールは登録後に設定できます。</p>
    <form action={action}>
      <input type="hidden" name="next" value={next}/>
      <div><label htmlFor="signup-email">メールアドレス</label><input id="signup-email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
      <div><label htmlFor="signup-password">パスワード</label><input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} aria-describedby="password-help" required /><small id="password-help" className="guest-note">8文字以上で設定してください。</small></div>
      <div><label htmlFor="signup-confirmation">パスワード（確認）</label><input id="signup-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></div>
      {state.error && <p role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} aria-busy={pending}>{pending ? "登録しています…" : "アカウントを作成"}</button>
    </form>
    <p><Link className="guest-account-button" href={loginUrl}>登録済みの方はログイン</Link></p>
  </>;
}
