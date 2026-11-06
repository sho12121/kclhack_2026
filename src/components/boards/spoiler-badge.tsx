import styles from "./spoiler-badge.module.css";

export function SpoilerBadge({ show }: { show?: boolean }) {
  return show ? <span className={styles.badge}>ネタバレ</span> : null;
}
