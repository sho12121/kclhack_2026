import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/social";
import { DatabaseError } from "@/lib/database-error";
import { NotificationInbox } from "@/components/social/notification-inbox";
import { SiteSidebar } from "@/components/layout/site-sidebar";
import layout from "@/components/layout/site-layout.module.css";
import styles from "@/components/social/notification-inbox.module.css";
export default async function NotificationsPage() {
  const auth = await getAuth();
  if (auth.error || !auth.data?.claims.sub) redirect("/login?next=/notifications");
  let inbox;
  let loadError = "";
  try { inbox = await getNotifications(); }
  catch (error) { loadError = error instanceof DatabaseError ? error.message : "通知を取得できませんでした。"; }
  return <div className={layout.layout}>
    <SiteSidebar active="notifications" />
    <section className={`${layout.content} ${styles.page}`} aria-labelledby="notification-title">
      <header className={styles.hero}>
        <h1 id="notification-title">通知</h1>
      </header>
      {loadError ? <div className={styles.empty} role="alert"><h2>通知を読み込めませんでした</h2><p>{loadError}</p><Link className={styles.button} href="/notifications">再読み込み</Link></div>
        : inbox && <NotificationInbox initial={inbox}/>}
    </section>
  </div>;
}
