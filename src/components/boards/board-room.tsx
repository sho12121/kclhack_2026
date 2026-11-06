"use client";

import Link from "next/link";
import { FavoriteButton } from "./favorite-button";
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { joinBoard, postMessage, deleteComment, deleteBoard } from "@/app/boards/actions";
import { parseMessageSnapshot } from "@/lib/board-messages";
import { formatBoardDate } from "@/lib/board-draft";
import type { BoardMessage, StoredBoard } from "@/types/board";
import styles from "./board-room.module.css";

function mergeMessages(current: BoardMessage[], incoming: BoardMessage[]) {
  return [...new Map([...current, ...incoming].map(message => [message.id, message])).values()]
    .sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0);
}

export function BoardRoom({ board, viewerId, viewerIsGuest, initialMessages, initialNow, initialTargetId = null }: {
  board: StoredBoard; viewerId: string; viewerIsGuest: boolean; initialMessages: BoardMessage[]; initialNow: number; initialTargetId?: string | null;
}) {
  const [highlightedId, setHighlightedId] = useState<string | null>(initialTargetId);
  const [historyView, setHistoryView] = useState(Boolean(initialTargetId));
  const [jumping, setJumping] = useState(false);
  const pendingJump = useRef<string | null>(initialTargetId);
  const [now, setNow] = useState(initialNow);
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [replyTarget, setReplyTarget] = useState<BoardMessage | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(initialMessages.length === 50);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [pending, startTransition] = useTransition();
  const latestId = useRef(initialMessages.at(-1)?.id ?? "0");
  const messagesRef = useRef(initialMessages);
  const activeRequest = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const stayAtBottom = useRef(!initialTargetId);
  const isStarted = Date.parse(board.startsAt) <= now;
  const isFull = board.capacity !== null && board.participantCount >= board.capacity;
  const guestBlocked = viewerIsGuest && !board.allowGuests;

  const refreshMessages = useCallback(async () => {
    if (!board.isMember || guestBlocked || unavailable) return;
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const oldestId = messagesRef.current[0]?.id ?? latestId.current;
      const response = await fetch(`/api/boards/${board.id}/messages?after=${latestId.current}&visible_after=${oldestId}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (response.status === 404) { setUnavailable(true); return; }
      if (!response.ok || !Array.isArray(data.messages)) throw new Error(data.error ?? "会話を取得できませんでした。");
      if (controller.signal.aborted) return;
      const incoming = data.messages as BoardMessage[];
      if (incoming.length) {
        latestId.current = incoming.at(-1)!.id;
      }
      const deleted = new Set<string>(Array.isArray(data.deletedIds) ? data.deletedIds : []);
      setMessages(current => mergeMessages(current, incoming).map(message => ({
        ...message,
        ...(deleted.has(message.id) ? {content:"削除されたコメントです。",deletedAt:message.deletedAt ?? "deleted"} : {}),
        ...(message.replyToId && deleted.has(message.replyToId) ? {replyToContent:"削除されたコメントです。"} : {}),
      })));
      setPollError(null);
    } catch (error) {
      if (!controller.signal.aborted) setPollError(error instanceof Error ? error.message : "会話を更新できませんでした。");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [board.id, board.isMember, guestBlocked, unavailable]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void refreshMessages(); }, 5000);
    return () => { window.clearInterval(clock); window.clearInterval(poll); activeRequest.current?.abort(); };
  }, [refreshMessages]);
  useEffect(() => {
    messagesRef.current = messages;
    const target = pendingJump.current && document.getElementById(`message-${pendingJump.current}`);
    if (target) {
      target.scrollIntoView({ block: "center" }); target.focus({ preventScroll: true }); pendingJump.current = null;
    }
    if (logRef.current && stayAtBottom.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  function removeComment(id: string, asModerator: boolean) {
    const confirmation = asModerator
      ? "掲示板管理者として、このコメントを削除しますか？本文は元に戻せません。"
      : "このコメントを削除しますか？本文は元に戻せません。";
    if (!window.confirm(confirmation)) return;
    setError(null); startTransition(async () => {
      try {
        const result = await deleteComment(id); if (result.error) { setError(result.error); return; }
        setMessages(current => current.map(message => ({...message,
          ...(message.id === id ? {content:"削除されたコメントです。",deletedAt:new Date().toISOString()} : {}),
          ...(message.replyToId === id ? {replyToContent:"削除されたコメントです。"} : {}),
        })));
        if (replyTarget?.id === id) setReplyTarget(null);
      } catch { setError("コメントを削除できませんでした。"); }
    });
  }

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

  async function navigateMessages(targetId?: string) {
    const existing = targetId ? document.getElementById(`message-${targetId}`) : null;
    if (existing) {
      stayAtBottom.current = false; setHighlightedId(targetId!);
      existing.scrollIntoView({ block: "center" }); existing.focus({ preventScroll: true }); return;
    }
    if (jumping || pending || loadingOlder) return;
    activeRequest.current?.abort();
    const controller = new AbortController(); activeRequest.current = controller;
    setJumping(true); setError(null);
    try {
      const response = await fetch(`/api/boards/${board.id}/messages${targetId ? `?target=${targetId}` : ""}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "コメントを取得できませんでした。");
      if (controller.signal.aborted) return;
      const snapshot = parseMessageSnapshot(data);
      pendingJump.current = targetId ?? null; stayAtBottom.current = !targetId;
      latestId.current = snapshot.messages.at(-1)?.id ?? "0";
      setHistoryView(Boolean(targetId)); setHighlightedId(targetId ?? null);
      setHasOlder(snapshot.messages.length === 50); setMessages(snapshot.messages);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "コメントを取得できませんでした。");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      setJumping(false);
    }
  }

  function handlePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || jumping || !content.trim() || !isStarted) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await postMessage(board.id, content, replyTarget?.id ?? null);
        if (result.error) { setError(result.error); return; }
        setContent("");
        setReplyTarget(null);
        stayAtBottom.current = true;
        const savedMessage = result.message;
        if (savedMessage) setMessages(current => mergeMessages(current, [{...savedMessage, replyToAuthorName: replyTarget?.authorName ?? null, replyToContent: replyTarget?.content.slice(0,240) ?? null}]));
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
        {!viewerIsGuest && <FavoriteButton key={`${board.id}-${board.isFavorite}`} boardId={board.id} initialFavorite={board.isFavorite} />}
      <p className={styles.movie}>{board.movie.title}</p>
      <p>{board.allowGuests ? "ゲスト参加OK" : "登録ユーザー限定"} · 作成者：{board.ownerIsGuest ? board.ownerName : <Link href={`/users/${board.ownerId}`}>{board.ownerName}</Link>}</p>
      <dl className={styles.info}>
        <div><dt>参加人数・定員</dt><dd>{board.participantCount}人 / {board.capacity === null ? "制限なし" : `${board.capacity}人`}</dd></div>
        <div><dt>開始日時</dt><dd>{formatBoardDate(board.startsAt)}</dd></div>
      </dl>
      {board.isOwner && !unavailable && <button type="button" className={styles.danger} disabled={pending} onClick={() => {
        if (!window.confirm("この掲示板を削除しますか？参加者全員の会話と参加登録も削除され、元に戻せません。")) return;
        setError(null);startTransition(async () => {
          try { const result = await deleteBoard(board.id); if (result.error) setError(result.error); }
          catch { setError("掲示板を削除できませんでした。"); }
        });
      }}>自分の掲示板を削除する</button>}
    </header>
    {unavailable ? <section className={styles.panel} role="status"><h2>この掲示板は削除されました</h2><Link href="/">掲示板一覧へ戻る</Link></section>
    : guestBlocked ? <section className={styles.panel}><h2>登録ユーザー限定の掲示板です</h2><p>ゲストとして参加することはできません。</p><Link href={`/login?${new URLSearchParams({next:`/boards/${board.id}`})}`}>通常アカウントでログインする</Link></section>
    : !board.isMember ? <section className={styles.panel}>
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
      {historyView && <button type="button" className={styles.secondary} disabled={jumping || pending || loadingOlder} onClick={() => void navigateMessages()}>最新の会話に戻る</button>}
      {jumping && <p role="status">コメントへ移動しています…</p>}
      {hasOlder && <button type="button" className={styles.secondary} disabled={loadingOlder || jumping} onClick={() => void loadOlder()}>{loadingOlder ? "読み込み中…" : "以前の会話を読み込む"}</button>}
      <div className={styles.messages} role="log" aria-label="会話の履歴" aria-live="polite" ref={logRef}
        onScroll={() => { const node = logRef.current; if (node) stayAtBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }}>
        {messages.length === 0 && <p className={styles.empty}>まだ会話はありません。{isStarted ? "最初の感想を投稿してみましょう。" : "開始日時になったら会話を始めましょう。"}</p>}
        {messages.map(message => <article id={`message-${message.id}`} tabIndex={-1} key={message.id} className={`${styles.message} ${message.authorId === viewerId ? styles.own : ""} ${highlightedId === message.id ? styles.highlighted : ""}`}>
          <div className={styles.messageMeta}><strong>{message.authorIsGuest === false ? <Link href={`/users/${message.authorId}`}>{message.authorName}</Link> : message.authorName}</strong><time dateTime={message.createdAt}>{formatBoardDate(message.createdAt)}</time></div>
          {message.replyToId && !message.deletedAt && <button type="button" className={styles.replyReference} disabled={jumping || pending || loadingOlder}
            onClick={() => void navigateMessages(message.replyToId!)} aria-label="返信元のコメントを表示">
            <span className={styles.quoteAuthor}>↳ {message.replyToAuthorName || "ユーザー"}さんへの返信</span>
            <span className={styles.quoteContent}>{message.replyToContent || `コメント #${message.replyToId}`}</span>
          </button>}
          <p>{message.content}</p>
          {!message.deletedAt && isStarted && <button type="button" className={styles.replyButton} disabled={pending || jumping} onClick={() => {
            setReplyTarget(message); inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }} aria-label={`${message.authorName}さんのコメントに返信`}>返信する</button>}
          {(message.authorId === viewerId || board.isOwner) && !message.deletedAt && <button type="button" className={styles.deleteComment} disabled={pending} onClick={()=>removeComment(message.id, message.authorId !== viewerId)}>{message.authorId === viewerId ? "自分のコメントを削除" : "管理者としてコメントを削除"}</button>}
        </article>)}
      </div>
      {pollError && <p role="alert" className={styles.error}>{pollError} <button type="button" className={styles.secondary} onClick={() => void refreshMessages()}>再読み込み</button></p>}
      {!isStarted && <p role="status">開始日時になると投稿できます。参加申し込みは完了しています。</p>}
      <form onSubmit={handlePost} className={styles.form}>
        {replyTarget && <div className={styles.replyComposer}>
          <div><strong>{replyTarget.authorName}さんに返信</strong><p>{replyTarget.content}</p></div>
          <button type="button" className={styles.secondary} disabled={pending} onClick={() => setReplyTarget(null)}>返信をやめる</button>
        </div>}
        <label htmlFor="message-content">感想・メッセージ</label>
        <textarea ref={inputRef} id="message-content" value={content} maxLength={2000} rows={4} required disabled={pending || jumping || !isStarted}
          onChange={event => setContent(event.target.value)} placeholder="映画の感想を入力してください" />
        <div className={styles.formFooter}><span>{content.length} / 2000文字</span><button type="submit" disabled={pending || jumping || !isStarted || !content.trim()}>{pending ? "投稿しています…" : replyTarget ? "返信する" : "投稿する"}</button></div>
      </form>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </section>}
  </div>;
}
