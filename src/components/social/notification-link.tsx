"use client";
import Link from "next/link";
import { BellIcon } from "@/components/ui/icons";
import { useEffect, useState } from "react";
import styles from "./social.module.css";
export function NotificationLink({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let busy = false;
    const update = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try { const response = await fetch("/api/notifications?count=1", {cache:"no-store",signal:controller.signal}); const data = await response.json();
        if (!controller.signal.aborted && response.ok && Number.isSafeInteger(data.unreadCount) && data.unreadCount >= 0) setCount(data.unreadCount);
      } catch {} finally { busy = false; }
    };
    void update(); const timer = window.setInterval(() => void update(), 30_000);
    window.addEventListener("notifications-read", update); document.addEventListener("visibilitychange", update);
    return () => {controller.abort();window.clearInterval(timer);window.removeEventListener("notifications-read",update);document.removeEventListener("visibilitychange",update);};
  }, [userId]);
  return <Link className={styles.notificationLink} href="/notifications" title="通知" aria-label={count ? `通知、未読${count}件` : "通知"}><span aria-hidden="true"><BellIcon /></span>{count > 0 && <span className={styles.badge} aria-hidden="true">{count > 99 ? "99+" : count}</span>}</Link>;
}
