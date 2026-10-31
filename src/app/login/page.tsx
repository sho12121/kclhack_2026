import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams; //searchParams で受け取り、params.next で取り出している。
  //paramsの内容 ⇒ { next: "/account" }
  const next = typeof params.next === "string" ? params.next : "/account";

  return (
    <section className="auth-card">
      <h1>ログイン</h1>

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
    </section>
  );
}
