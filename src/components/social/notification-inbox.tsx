"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { NotificationInbox as Inbox, AppNotification } from "@/types/social";
import { markNotificationsRead } from "@/app/notifications/actions";
import { formatBoardDate } from "@/lib/board-draft";
import { parseInbox } from "@/lib/social-data";
import styles from "./social.module.css";
function description(item: AppNotification) {
  if (item.kind === "follow") return `${item.actorName}さんにフォローされました。`;
  if (item.kind === "board_created") return `${item.actorName}さんが掲示板を作成しました。`;
  if (item.kind === "board_deleted") return "参加していた掲示板が削除されました。";
  return `${item.actorName}さんが参加中の掲示板に投稿しました。`;
}
export function NotificationInbox({ initial }: { initial: Inbox }) {
  const [inbox, setInbox] = useState(initial);
  const [hasOlder, setHasOlder] = useState(initial.items.length === 30);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function read(ids?: string[]) {
    setError(""); startTransition(async () => {
      try {
        const result = await markNotificationsRead(ids);
        if (result.error) { setError(result.error); return; }
        const readAt = new Date().toISOString();
        setInbox(current => {
          const changed = current.items.filter(item => !item.readAt && (!ids || ids.includes(item.id))).length;
          return { items: current.items.map(item => !ids || ids.includes(item.id) ? {...item,readAt:item.readAt ?? readAt} : item), unreadCount: ids ? Math.max(0,current.unreadCount-changed) : 0 };
        });
        window.dispatchEvent(new Event("notifications-read"));
      } catch { setError("通知を更新できませんでした。もう一度お試しください。"); }
    });
  }
  function loadOlder() {
    const before = inbox.items.at(-1)?.id; if (!before) return;
    setError(""); startTransition(async () => {
      try { const response = await fetch(`/api/notifications?before=${before}`, {cache:"no-store"});
        const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "通知を取得できませんでした。");
        const next = parseInbox(data);
        setInbox(current => ({items:[...new Map([...current.items,...next.items].map(item=>[item.id,item])).values()],unreadCount:next.unreadCount}));
        setHasOlder(next.items.length === 30);
      } catch (error) { setError(error instanceof Error ? error.message : "通知を取得できませんでした。"); }
    });
  }
  function reload() {
    setError("");startTransition(async()=>{
      try {const response=await fetch("/api/notifications",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error ?? "通知を取得できませんでした。");
        const next=parseInbox(data);setInbox(next);setHasOlder(next.items.length===30);window.dispatchEvent(new Event("notifications-read"));
      } catch(error) {setError(error instanceof Error ? error.message : "通知を取得できませんでした。");}
    });
  }
  return <><div className={styles.row}><p role="status">未読 {inbox.unreadCount}件</p><div className={styles.tabs}><button className={`${styles.button} ${styles.secondary}`} disabled={pending} onClick={reload}>通知を更新</button><button className={styles.button} disabled={pending || inbox.unreadCount === 0} onClick={()=>read()}>すべて既読にする</button></div></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!inbox.items.length && <p>通知はまだありません。</p>}
    <ul className={styles.list}>{inbox.items.map(item => <li key={item.id} className={`${styles.card} ${!item.readAt ? styles.unread : ""}`}>
      <p>{!item.readAt && <strong>未読 · </strong>}{description(item)}</p>
      {item.boardTitle && <p>{item.boardTitle}</p>}
      <div className={styles.row}><time className={styles.muted} dateTime={item.createdAt}>{formatBoardDate(item.createdAt)}</time>
        <div className={styles.tabs}>
          {item.boardId ? <Link href={`/boards/${item.boardId}`}>掲示板を開く</Link> : item.kind === "follow" && item.actorId ? <Link href={`/users/${item.actorId}`}>プロフィールを見る</Link> : null}
          {!item.readAt && <button className={`${styles.button} ${styles.secondary}`} disabled={pending} onClick={()=>read([item.id])}>既読にする</button>}
        </div>
      </div>
    </li>)}</ul>
    {hasOlder && <button className={styles.button} disabled={pending} onClick={loadOlder}>以前の通知を読み込む</button>}
  </>;
}
