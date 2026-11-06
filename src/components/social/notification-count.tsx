"use client";

import { useEffect, useState } from "react";
import styles from "./notification-count.module.css";

export function NotificationCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    let queued = false;
    async function update() {
      if (controller.signal.aborted || document.visibilityState !== "visible") return;
      if (busy) { queued = true; return; }
      busy = true;
      try {
        const response = await fetch("/api/notifications?count=1", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) { if (!controller.signal.aborted) setCount(0); return; }
        const data = await response.json();
        if (!controller.signal.aborted && response.ok && Number.isSafeInteger(data.unreadCount) && data.unreadCount >= 0) setCount(data.unreadCount);
      } catch { /* 件数取得の失敗でメニュー操作を妨げない。 */ }
      finally {
        busy = false;
        if (queued && !controller.signal.aborted) { queued = false; void update(); }
      }
    }
    void update();
    const timer = window.setInterval(() => void update(), 30_000);
    window.addEventListener("notifications-read", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      controller.abort(); window.clearInterval(timer);
      window.removeEventListener("notifications-read", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return count > 0 ? <sup className={styles.count} aria-label={`未読${count}件`}>{count > 99 ? "99+" : count}</sup> : null;
}
