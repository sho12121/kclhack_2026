import { login } from "./actions";
import Link from "next/link";
import { safeAuthRedirect } from "@/lib/auth-redirect";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
    confirmation?: string | string[];
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams; //searchParams で受け取り、params.next で取り出している。
  //paramsの内容 ⇒ { next: "/account" }
  const next = safeAuthRedirect(params.next);

  return (
    <section className="auth-card">
      <h1>ログイン</h1>
      {params.confirmation === "1" && <p role="status">メールを確認済みの場合は、登録したメールアドレスとパスワードでログインしてください。未確認の場合は、最新の確認メールを同じブラウザで開いてください。</p>}

      <form action={login}>   {/*フォームを送信するとlogin(actions.ts)に入力内容送信*/}
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit">ログイン</button>

        {params.error && (
          <p role="alert">
            ログインできませんでした。入力内容を確認してください。
          </p>
        )}
      </form>
      <p><Link className="guest-account-button" href={`/signup?${new URLSearchParams({ next })}`}>アカウントを作成する</Link></p>
      <p><Link href={`/guest?${new URLSearchParams({ next: next === "/account" ? "/?create=1" : next })}`}>登録せずゲストで利用する</Link></p>
    </section>
  );
}
