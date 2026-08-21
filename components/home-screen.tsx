"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./app-provider";
import { BoardCard } from "./board-card";
export function HomeScreen() { const { boards } = useApp(); const [query, setQuery] = useState(""); const recruiting = boards.filter((board) => (board.status === "recruiting" || board.status === "full") && board.movie.title.includes(query.trim())); return <section className="board-home"><div className="section-heading"><h2>語り合い板</h2><span>{recruiting.length} 件</span></div><label className="board-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="映画タイトルで検索" /></label>{recruiting.length ? <section className="board-grid">{recruiting.map((board) => <BoardCard key={board.id} board={board} />)}</section> : <p className="empty">該当する語り合い板はありません。</p>}<Link className="create-board-fab" href="/boards/new" aria-label="語り合い板を作成">＋</Link></section>; }
