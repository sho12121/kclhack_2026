import Link from "next/link";
import { logout } from "@/app/login/actions";
import { MovieCameraLogo } from "@/components/ui/icons";
import { getAuth } from "@/lib/supabase/server";
import styles from "./site-layout.module.css";
import { NotificationLink } from "@/components/social/notification-link";

/** URLではなく、サーバーで検証したログイン状態に合わせて表示する。 */
export async function SiteHeader() {
  let isLoggedIn = false;
  let isGuest = false;
  let userId = "";

  // 接続情報がない開発環境でも、公開ページの閲覧はできるようにする。
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const { data, error } = await getAuth();
    isLoggedIn = !error && Boolean(data?.claims.sub);
    isGuest = isLoggedIn && data?.claims.is_anonymous === true;
    userId = isLoggedIn ? data!.claims.sub : "";
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <Link href="/" className={styles.brand} aria-label="ハナシネマ ホーム">
          <MovieCameraLogo />
          <span>ハナシネマ</span>
        </Link>
        <p className={styles.subtitle}>映画を語り合える掲示板</p>
      </div>

      <nav className={styles.headerNav} aria-label="アカウント操作">
        {isLoggedIn && <NotificationLink key={userId} userId={userId}/>}
        {isGuest && <><span className={styles.guestBadge}>ゲスト利用中</span><Link href="/login" className={styles.authButton}>ログイン</Link></>}
        {isLoggedIn ? (
          <form action={logout}>
            <button type="submit" className={`${styles.authButton} ${styles.logoutButton}`}>{isGuest ? "終了する" : "ログアウト"}</button>
          </form>
        ) : (
          <Link href="/login" className={styles.authButton}>ログイン</Link>
        )}
      </nav>
    </header>
  );
}
