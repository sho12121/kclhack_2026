"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { joinBoard, postMessage } from "@/app/boards/actions";
import { formatBoardDate } from "@/lib/board-draft";
import type { BoardMessage, StoredBoard } from "@/types/board";
import styles from "./board-room.module.css";

function mergeMessages(current: BoardMessage[], incoming: BoardMessage[]) {
  return [...new Map([...current, ...incoming].map(message => [message.id, message])).values()]
    .sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0);
}

export function BoardRoom({ board, viewerId, initialMessages, initialNow }: {
  board: StoredBoard; viewerId: string; initialMessages: BoardMessage[]; initialNow: number;
}) {
  const [now, setNow] = useState(initialNow);
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(initialMessages.length === 50);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pending, startTransition] = useTransition();
  const latestId = useRef(initialMessages.at(-1)?.id ?? "0");
  const activeRequest = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const stayAtBottom = useRef(true);
  const isStarted = Date.parse(board.startsAt) <= now;
  const isFull = board.capacity !== null && board.participantCount >= board.capacity;

  const refreshMessages = useCallback(async () => {
    if (!board.isMember) return;
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const response = await fetch(`/api/boards/${board.id}/messages?after=${latestId.current}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.messages)) throw new Error(data.error ?? "会話を取得できませんでした。");
      if (controller.signal.aborted) return;
      const incoming = data.messages as BoardMessage[];
      if (incoming.length) {
        latestId.current = incoming.at(-1)!.id;
        setMessages(current => mergeMessages(current, incoming));
      }
      setPollError(null);
    } catch (error) {
      if (!controller.signal.aborted) setPollError(error instanceof Error ? error.message : "会話を更新できませんでした。");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [board.id, board.isMember]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void refreshMessages(); }, 5000);
    return () => { window.clearInterval(clock); window.clearInterval(poll); activeRequest.current?.abort(); };
  }, [refreshMessages]);
  useEffect(() => {
    if (logRef.current && stayAtBottom.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    if (loadingOlder || !messages.length) return;
    setLoadingOlder(true);
    stayAtBottom.current = false;
    try {
      const response = await fetch(`/api/boards/${board.id}/messages?before=${messages[0].id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.messages)) throw new Error(data.error ?? "会話を取得できませんでした。");
      const oldHeight = logRef.current?.scrollHeight ?? 0;
      setMessages(current => mergeMessages(current, data.messages));
      setHasOlder(data.messages.length === 50);
      requestAnimationFrame(() => { if (logRef.current) logRef.current.scrollTop += logRef.current.scrollHeight - oldHeight; });
    } catch { setPollError("以前の会話を取得できませんでした。もう一度お試しください。"); }
    finally { setLoadingOlder(false); }
  }

  function handlePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !content.trim() || !isStarted) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await postMessage(board.id, content);
        if (result.error) { setError(result.error); return; }
        setContent("");
        stayAtBottom.current = true;
        const savedMessage = result.message;
        if (savedMessage) setMessages(current => mergeMessages(current, [savedMessage]));
        // 投稿成功後の追加取得を、入力欄を使えるように戻す条件にしない。
        void refreshMessages();
      } catch { setError("投稿できませんでした。通信環境を確認して再度お試しください。"); }
    });
  }

  return <div className={styles.room}>
    <Link href="/">← 掲示板一覧へ</Link>
    <header className={styles.heading}>
      <span className={styles.status}>{isStarted ? "開催中" : "開催予定"}</span>
      <h1>{board.title}</h1>
      <p className={styles.movie}>{board.movie.title}</p>
      <dl className={styles.info}>
        <div><dt>参加人数・定員</dt><dd>{board.participantCount}人 / {board.capacity === null ? "制限なし" : `${board.capacity}人`}</dd></div>
        <div><dt>開始日時</dt><dd>{formatBoardDate(board.startsAt)}</dd></div>
      </dl>
    </header>
    {!board.isMember ? <section className={styles.panel}>
      <h2>この掲示板に参加する</h2>
      <p>参加すると、参加者だけが見られる会話を閲覧できます。投稿は開始日時から可能です。</p>
      <button disabled={pending || isFull} onClick={() => {
        setError(null);
        startTransition(async () => {
          // joinBoard内のrevalidatePathで参加状態が届くため、二重に再読み込みしない。
          try { const result = await joinBoard(board.id); if (result.error) setError(result.error); }
          catch { setError("参加できませんでした。通信環境を確認してください。"); }
        });
      }}>{isFull ? "満員です" : pending ? "申し込み中…" : isStarted ? "参加する" : "参加申し込み"}</button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </section> : <section className={styles.panel} aria-labelledby="conversation-title">
      <h2 id="conversation-title">参加者の会話</h2>
      {hasOlder && <button type="button" className={styles.secondary} disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? "読み込み中…" : "以前の会話を読み込む"}</button>}
      <div className={styles.messages} role="log" aria-label="会話の履歴" aria-live="polite" ref={logRef}
        onScroll={() => { const node = logRef.current; if (node) stayAtBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }}>
        {messages.length === 0 && <p className={styles.empty}>まだ会話はありません。{isStarted ? "最初の感想を投稿してみましょう。" : "開始日時になったら会話を始めましょう。"}</p>}
        {messages.map(message => <article key={message.id} className={`${styles.message} ${message.authorId === viewerId ? styles.own : ""}`}>
          <div className={styles.messageMeta}><strong>{message.authorName}</strong><time dateTime={message.createdAt}>{formatBoardDate(message.createdAt)}</time></div>
          <p>{message.content}</p>
        </article>)}
      </div>
      {pollError && <p role="alert" className={styles.error}>{pollError} <button type="button" className={styles.secondary} onClick={() => void refreshMessages()}>再読み込み</button></p>}
      {!isStarted && <p role="status">開始日時になると投稿できます。参加申し込みは完了しています。</p>}
      <form onSubmit={handlePost} className={styles.form}>
        <label htmlFor="message-content">感想・メッセージ</label>
        <textarea id="message-content" value={content} maxLength={2000} rows={4} required disabled={pending || !isStarted}
          onChange={event => setContent(event.target.value)} placeholder="映画の感想を入力してください" />
        <div className={styles.formFooter}><span>{content.length} / 2000文字</span><button type="submit" disabled={pending || !isStarted || !content.trim()}>{pending ? "投稿しています…" : "投稿する"}</button></div>
      </form>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </section>}
  </div>;
}
