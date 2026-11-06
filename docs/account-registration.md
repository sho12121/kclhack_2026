# アカウント登録

- `/signup` でメール・パスワード・確認用パスワードを入力する。
- Server Actionから既存のSupabase Authへ `signUp` を送る。パスワードをプロフィールDBやログに保存しない。
- 確認不要の設定ならログイン状態で戻り先（通常 `/account`）へ進む。
- メール確認が必要なら確認案内を表示する。標準の確認メールから `/auth/callback` に戻り、PKCEコードをCookie付きセッションに交換する。同じブラウザで開く。
- 期限切れ・別ブラウザ等で交換できなかった場合はログイン画面に案内する。メール確認済みならパスワードでログインできる。
- ゲストからのデータ引き継ぎではなく、新規アカウントを作る機能。

## Supabase側の設定

Authenticationのメール・パスワード認証と新規登録を有効にする。
URL ConfigurationでSite URLを `https://hanacinema.vercel.app` にし、Redirect URLsに以下を追加する。

- `http://localhost:3000/auth/callback**`
- `https://hanacinema.vercel.app/auth/callback**`

ほかの開発用ポートやPreviewを使う場合は、その環境の戻り先も追加する。
メール確認の有無はConfirm emailの設定に従う。確認メールは標準のConfirmationURLを使用する想定。
確認メールを一般利用者へ送るにはSupabaseのメール送信制限・SMTP設定も確認する。
既存DBの変更やSQL実行は不要。
