import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/social";
import { DatabaseError } from "@/lib/database-error";
import { NotificationInbox } from "@/components/social/notification-inbox";
import styles from "@/components/social/social.module.css";
export default async function NotificationsPage() {
  const auth = await getAuth();
  if (auth.error || !auth.data?.claims.sub) redirect("/login?next=/notifications");
  let inbox;
  try { inbox = await getNotifications(); }
  catch (error) { return <section className={styles.page}><h1>通知</h1><p role="alert">{error instanceof DatabaseError ? error.message : "通知を取得できませんでした。"}</p><Link href="/notifications">再読み込み</Link></section>; }
  return <section className={styles.page}><Link href="/">← 掲示板一覧へ</Link><h1>通知</h1><p className={styles.muted}>フォローや、参加中の掲示板への投稿をお知らせします。</p><NotificationInbox initial={inbox}/></section>;
}
