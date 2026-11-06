import { isDatabaseId } from "./board-messages.ts";

/** アプリ内の許可した画面だけに戻す。外部URLや任意のパスは受け付けない。 */
export function safeAuthRedirect(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") return fallback;
  if (["/", "/account", "/?create=1", "/notifications", "/users"].includes(value)) return value;
  const messageLink = value.match(/^\/boards\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\?message=([0-9]+)$/i);
  if (messageLink && isDatabaseId(messageLink[1])) return value;
  return /^\/(boards|users)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : fallback;
}
