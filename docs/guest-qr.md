# QRから自動でゲスト利用を開始する

発表用の自動開始URLは `https://hanacinema.vercel.app/guest/qr` です。コードをVercelへ反映した後で使用します。

- PNG画像：`public/guest-auto-qr.png`
- SVG画像：`public/guest-auto-qr.svg`

このQRを読み込むと、未ログインの場合はメールアドレス・パスワードや開始ボタンの操作なしでゲスト利用を開始し、掲示板一覧を開きます。既存のゲストや通常アカウントでログイン済みの場合は、同じセッションのまま開きます。利用者ごとに別のゲストとなり、QRに認証情報は含めません。

以前の `guest-qr.png` / `guest-qr.svg` は手動開始の `/guest` を開くQRとして残しています。自動開始に切り替える場合は発表資料の画像も `guest-auto-qr.png` に差し替えてください。

## 行き先を変える

必要な場合は `/guest/qr?next=...` をQRにします。`next` はURLエンコードします。

- 掲示板一覧：`/guest/qr`
- 掲示板作成：`/guest/qr?next=%2F%3Fcreate%3D1`
- 特定の掲示板：`/guest/qr?next=%2Fboards%2F掲示板のUUID`

戻り先はアプリ内の許可されたパスだけです。外部URLは受け付けません。

## 処理

1. Server Componentはログイン状態を確認します。GETやリンクの先読みではゲストを作りません。
2. 未ログインの場合、ブラウザでフォームを自動送信し、既存のServer Action `startGuest` をPOSTで実行します。
3. Actionでも既存セッションを再確認し、必要な場合だけ匿名サインインします。Cookieの設定後、行き先へ移動します。
4. 通信失敗・設定不足・利用回数制限ではエラーを表示し、自動送信を止めます。再試行はボタン操作で行います。

Strict ModeのEffect再実行で同じフォームを二重に送信しないようにしています。JavaScriptが無効な場合は通常のフォーム送信で開始できます。通常の `/guest` は手動開始を維持します。

DBの追加設定は不要です。Supabaseで有効にしているAnonymous Sign-Insを引き続き使い、ゲスト参加の可否・フォローやプロフィールの制限も従来のルールを適用します。
