import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getAuth } from "@/lib/supabase/server";
import { isUuid, listBoards, getMessageSnapshot, getMessageContext } from "@/lib/boards";
import { isDatabaseId } from "@/lib/board-messages";
import { DatabaseError } from "@/lib/database-error";
import { BoardRoom } from "@/components/boards/board-room";
import type { StoredBoard, BoardMessage } from "@/types/board";

async function requestTime() { await connection(); return Date.now(); }

export default async function BoardPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ message?: string | string[] }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const requested = (await searchParams).message;
  const target = isDatabaseId(requested) ? requested : null;
  const next = `/boards/${id}${target ? `?message=${target}` : ""}`;
  const { data, error } = await getAuth();
  if (error || !data?.claims.sub) redirect(`/login?${new URLSearchParams({ next })}`);
  let board: StoredBoard | undefined;
  let messages: BoardMessage[] = [];
  try {
    // コメントもDB側で参加権限を検証するため、募集情報と並行して取得できる。
    const [boards, snapshot] = await Promise.all([
      listBoards(id),
      (target ? getMessageContext(id, target) : getMessageSnapshot(id)).then(value => ({ value, error: null })).catch(error => ({ value: null, error })),
    ]);
    board = boards[0];
    if (board?.isMember && !(data.claims.is_anonymous === true && !board.allowGuests)) {
      if (snapshot.error) throw snapshot.error;
      messages = snapshot.value?.messages ?? [];
      board.filterEnabled = snapshot.value?.filterEnabled ?? board.filterEnabled;
      board.filterVersion = snapshot.value?.filterVersion ?? board.filterVersion;
    }
  } catch (error) {
    return <section className="auth-card"><h1>掲示板を読み込めませんでした</h1><p role="alert">{error instanceof DatabaseError ? error.message : "通信環境を確認して再度お試しください。"}</p><Link href={`/boards/${id}`}>再読み込み</Link><p><Link href="/">掲示板一覧へ</Link></p></section>;
  }
  if (!board) notFound();
  const initialNow = await requestTime();
  return <BoardRoom key={`${id}-${board.isMember}-${target ?? "latest"}`} initialTargetId={target} board={board} viewerId={data.claims.sub} viewerIsGuest={data.claims.is_anonymous === true} initialMessages={messages} initialNow={initialNow} />;
}
