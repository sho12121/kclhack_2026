import Link from "next/link";
import { CameraProjectorWatermark, ChatIcon, HomeIcon, SettingsIcon, UserIcon } from "@/components/ui/icons";
import styles from "./site-layout.module.css";

type SiteSidebarProps = {
  active: "boards" | "account";
  onEditProfile?: () => void;
};

export function SiteSidebar({ active, onEditProfile }: SiteSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="サイドナビゲーション">
      <nav className={styles.navGroup}>
        <Link href="/" className={`${styles.navLink} ${active === "boards" ? styles.active : ""}`}
          aria-current={active === "boards" ? "page" : undefined}>
          <HomeIcon /><span>掲示板一覧</span>
        </Link>
        <Link href="/?create=1" className={styles.navLink}>
          <ChatIcon /><span>掲示板を作成</span>
        </Link>
        <Link href="/account" className={`${styles.navLink} ${active === "account" ? styles.active : ""}`}
          aria-current={active === "account" ? "page" : undefined}>
          <UserIcon /><span>マイページ</span>
        </Link>
        {onEditProfile && (
          <button type="button" className={styles.navLink} onClick={onEditProfile}>
            <SettingsIcon /><span>プロフィール編集</span>
          </button>
        )}
      </nav>
      <div className={styles.sidebarFooter}>
        <CameraProjectorWatermark />
        <p>好きな映画の話で、<br />もっと広がる世界を。</p>
      </div>
    </aside>
  );
}
