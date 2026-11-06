import Link from "next/link";
import { NotificationCount } from "@/components/social/notification-count";
import { BellIcon, CameraProjectorWatermark, ChatIcon, HomeIcon, SettingsIcon, UserIcon } from "@/components/ui/icons";
import styles from "./site-layout.module.css";

type SiteSidebarProps = {
  active?: "boards" | "create" | "account" | "notifications";
  onEditProfile?: () => void;
};

export function SiteSidebar({ active, onEditProfile }: SiteSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="サイドナビゲーション">
      <nav className={styles.navGroup}>
        <Link prefetch={true} href="/" className={`${styles.navLink} ${active === "boards" ? styles.active : ""}`}
          aria-current={active === "boards" ? "page" : undefined}>
          <HomeIcon /><span>掲示板一覧</span>
        </Link>
        <Link prefetch={true} href="/?create=1" className={`${styles.navLink} ${active === "create" ? styles.active : ""}`}
          aria-current={active === "create" ? "page" : undefined}>
          <ChatIcon /><span>掲示板を作成</span>
        </Link>
        <Link prefetch={true} href="/account" className={`${styles.navLink} ${active === "account" ? styles.active : ""}`}
          aria-current={active === "account" ? "page" : undefined}>
          <UserIcon /><span>マイページ</span>
        </Link>
        <Link prefetch={true} href="/notifications" className={`${styles.navLink} ${active === "notifications" ? styles.active : ""}`}
          aria-current={active === "notifications" ? "page" : undefined}>
          <BellIcon /><span className={styles.notificationLabel}>通知<NotificationCount /></span>
        </Link>
        {onEditProfile && (
          <button type="button" className={styles.navLink} onClick={onEditProfile}>
            <SettingsIcon /><span>プロフィール編集</span>
          </button>
        )}
      </nav>
      <div className={styles.sidebarFooter}>
        <CameraProjectorWatermark />
      </div>
    </aside>
  );
}
