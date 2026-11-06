"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { NotificationInbox as Inbox, AppNotification } from "@/types/social";
import { markNotificationsRead } from "@/app/notifications/actions";
import { formatBoardDate } from "@/lib/board-draft";
import { parseInbox } from "@/lib/social-data";
import { BellIcon, ChatIcon, FilmIcon, UserIcon, ChevronRightIcon } from "@/components/ui/icons";
import styles from "./notification-inbox.module.css";
function description(item: AppNotification) {
  if (item.kind === "board_invitation") return item.boardId ? `${item.actorName}さんから掲示板に招待されました。` : "招待された掲示板は削除されました。";
  if (item.kind === "follow") return `${item.actorName}さんにフォローされました。`;
  if (item.kind === "board_created") return `${item.actorName}さんが掲示板を作成しました。`;
  if (item.kind === "board_deleted") return "参加していた掲示板が削除されました。";
  return `${item.actorName}さんがあなたのコメントに返信しました。`;
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
  return <>
    <div className={styles.toolbar}>
      <div className={styles.summary} role="status" aria-live="polite"><strong>{inbox.unreadCount}</strong><span>件の未読通知</span></div>
      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.secondary}`} disabled={pending} onClick={reload}>更新する</button>
        <button className={styles.button} disabled={pending || inbox.unreadCount === 0} onClick={()=>read()}>すべて既読にする</button>
      </div>
    </div>
    {pending && <p className={styles.progress} role="status">通知を更新しています…</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!inbox.items.length && <div className={styles.empty}><div className={styles.emptyIcon} aria-hidden="true"><BellIcon /></div><h2>通知はまだありません</h2><p>掲示板に参加すると、新しい投稿のお知らせがここに届きます。</p><Link href="/" className={styles.button}>掲示板を見に行く</Link></div>}
    <ul className={styles.list} aria-label="届いた通知" aria-busy={pending}>{inbox.items.map(item => {
      const kind = item.kind === "board_invitation" ? "掲示板への招待" : item.kind === "follow" ? "フォロー" : item.kind === "board_created" ? "新しい掲示板" : item.kind === "board_deleted" ? "掲示板の削除" : "コメントへの返信";
      const Icon = item.kind === "follow" ? UserIcon : item.kind === "board_created" ? FilmIcon : item.kind === "board_deleted" ? BellIcon : ChatIcon;
      return <li key={item.id} className={`${styles.card} ${!item.readAt ? styles.unread : ""}`}>
        <div className={styles.eventIcon} aria-hidden="true"><Icon /></div>
        <div className={styles.body}>
          <div className={styles.meta}><span className={styles.kind}>{kind}</span><span className={!item.readAt ? styles.unreadLabel : styles.readLabel}>{item.readAt ? "既読" : "未読"}</span><time dateTime={item.createdAt}>{formatBoardDate(item.createdAt)}</time></div>
          <h2 className={styles.description}>{description(item)}</h2>
          {item.boardTitle && <p className={styles.boardTitle}>{item.boardTitle}</p>}
          <div className={styles.cardActions}>
            {item.boardId ? <Link className={styles.destination} href={`/boards/${item.boardId}`}>掲示板を開く<ChevronRightIcon /></Link> : item.kind === "follow" && item.actorId ? <Link className={styles.destination} href={`/users/${item.actorId}`}>プロフィールを見る<ChevronRightIcon /></Link> : null}
            {!item.readAt && <button className={styles.readButton} disabled={pending} onClick={()=>read([item.id])} aria-label={`${kind}の通知を既読にする`}>既読にする</button>}
          </div>
        </div>
      </li>;
    })}</ul>
    {hasOlder && <div className={styles.more}><button className={`${styles.button} ${styles.secondary}`} disabled={pending} onClick={loadOlder}>以前の通知を読み込む</button></div>}
  </>;
}
