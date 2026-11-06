export class DatabaseError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) { super(message); this.status = status; }
}

/** SQLや接続先などの内部情報を画面に出さず、利用者が対処できる内容に変換する。 */
export function databaseError(value: unknown): DatabaseError {
  const error = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";
  const known: Record<string, [string, number]> = {
    AUTH_REQUIRED: ["ログインまたはゲスト利用を開始してください。", 401],
    ACCOUNT_REQUIRED: ["この機能には通常アカウントでのログインが必要です。", 403],
    GUEST_NOT_ALLOWED: ["この掲示板は登録ユーザー限定です。通常アカウントでログインしてください。", 403],
    USER_NOT_FOUND: ["ユーザーが見つかりません。", 404],
    MESSAGE_NOT_FOUND: ["コメントが見つかりません。", 404],
    FORBIDDEN: ["この操作は許可されていません。", 403],
    BOARD_NOT_FOUND: ["掲示板が見つかりません。", 404],
    BOARD_FULL: ["定員に達したため参加できません。", 409],
    NOT_A_MEMBER: ["会話の閲覧・投稿には掲示板への参加が必要です。", 403],
    NOT_STARTED: ["開始日時になると投稿できます。", 409],
    START_IN_PAST: ["開始日時を現在より後に設定し直してください。", 400],
    INVALID_MESSAGE: ["メッセージを1〜2000文字で入力してください。", 400],
    REPLY_TARGET_NOT_FOUND: ["返信先のコメントが見つからないか、削除されています。返信先を解除して再度お試しください。", 400],
    INVITEE_NOT_FOLLOWED: ["招待できるのはフォロー中の登録ユーザーです。選び直してください。", 400],
    INVALID_INPUT: ["入力内容を確認してください。", 400],
  };
  if (Object.hasOwn(known, message)) return new DatabaseError(...known[message]);
  if (["42P01", "42703", "PGRST202", "PGRST205", "42501"].includes(code)) {
    return new DatabaseError("データベースの初期設定が必要です。追加用SQLの実行を確認してください。", 503);
  }
  if (["23514", "22007", "22P02", "22001", "23502"].includes(code)) return new DatabaseError("入力内容が保存条件に合いません。内容を確認してください。", 400);
  return new DatabaseError("データを取得・保存できませんでした。通信環境を確認して再度お試しください。", 502);
}
