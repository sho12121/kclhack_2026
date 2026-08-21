"use client";

import Link from "next/link";
import { useApp } from "./app-provider";
import { BoardCard } from "./board-card";

export function JoinedScreen() {
  const { boards, currentUser } = useApp();
  const joined = boards.filter((board) => board.members.some((member) => member.userId === currentUser.id));
  return <section><p className="eyebrow">JOINED BOARDS</p><h1 className="page-title">参加中の語り合い</h1><p className="muted">参加している板はここから確認できます。</p>{joined.length ? <div className="board-grid">{joined.map((board) => <BoardCard board={board} key={board.id} />)}</div> : <div className="empty"><p>まだ参加中の板はありません。</p><Link className="button primary" href="/">掲示板を探す <span>→</span></Link></div>}</section>;
}
