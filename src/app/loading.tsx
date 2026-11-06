import { SiteSidebar } from "@/components/layout/site-sidebar";
import layout from "@/components/layout/site-layout.module.css";
import styles from "./loading.module.css";

export default function Loading() {
  return <div className={layout.layout}>
    <SiteSidebar />
    <div className={layout.content} role="status" aria-live="polite" aria-label="画面を読み込んでいます">
      <p className={styles.label}>読み込み中…</p>
      <div className={styles.card} aria-hidden="true"><div className={styles.heading} /><div className={styles.line} /><div className={styles.shortLine} /></div>
      <div className={styles.card} aria-hidden="true"><div className={styles.heading} /><div className={styles.line} /><div className={styles.line} /><div className={styles.shortLine} /></div>
    </div>
  </div>;
}
