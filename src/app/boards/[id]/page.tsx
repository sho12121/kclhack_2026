import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getAuth } from "@/lib/supabase/server";
import { isUuid, listBoards, getMessageSnapshot } from "@/lib/boards";
import { DatabaseError } from "@/lib/database-error";
import { BoardRoom } from "@/components/boards/board-room";
import type { StoredBoard, BoardMessage } from "@/types/board";

async function requestTime() { await connection(); return Date.now(); }

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { data, error } = await getAuth();
  if (error || !data?.claims.sub) redirect(`/login?${new URLSearchParams({ next: `/boards/${id}` })}`);
  let board: StoredBoard | undefined;
  let messages: BoardMessage[] = [];
  try {
    board = (await listBoards(id))[0];
    if (board?.isMember && !(data.claims.is_anonymous === true && !board.allowGuests)) messages = (await getMessageSnapshot(id)).messages;
  } catch (error) {
    return <section className="auth-card"><h1>掲示板を読み込めませんでした</h1><p role="alert">{error instanceof DatabaseError ? error.message : "通信環境を確認して再度お試しください。"}</p><Link href={`/boards/${id}`}>再読み込み</Link><p><Link href="/">掲示板一覧へ</Link></p></section>;
  }
  if (!board) notFound();
  const initialNow = await requestTime();
  return <BoardRoom key={`${id}-${board.isMember}`} board={board} viewerId={data.claims.sub} viewerIsGuest={data.claims.is_anonymous === true} initialMessages={messages} initialNow={initialNow} />;
}
