"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import { ChevronDownIcon, HomeIcon, MovieCameraLogo, UserIcon } from "@/components/ui/icons";
import styles from "./site-layout.module.css";

/** 全ページ共通のブランドとナビゲーション。認証情報は保持しない。 */
export function SiteHeader() {
  const isAccount = usePathname() === "/account";

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <Link href="/" className={styles.brand} aria-label="ハナシネマ ホーム">
          <MovieCameraLogo />
          <span>ハナシネマ</span>
        </Link>
        <p className={styles.subtitle}>映画について語りたい人が語り合える掲示板</p>
      </div>

      <nav className={styles.headerNav} aria-label="メインナビゲーション">
        <Link href="/" className={styles.homeLink}><HomeIcon /><span>掲示板一覧</span></Link>
        {isAccount ? (
          <details className={styles.accountMenu}>
            <summary className={styles.accountButton}>
              <span className={styles.avatar}><UserIcon /></span>
              <span>マイページ</span><ChevronDownIcon />
            </summary>
            <div className={styles.dropdown}>
              <Link href="/account">プロフィール</Link>
              <form action={logout}><button type="submit">ログアウト</button></form>
            </div>
          </details>
        ) : (
          <>
            <Link href="/login" className={styles.loginLink}>ログイン</Link>
            <Link href="/account" className={styles.accountButton}>
              <UserIcon /><span>マイページ</span>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
