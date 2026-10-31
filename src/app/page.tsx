import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { BoardCreateForm } from "@/components/boards/board-create-form";
import { BoardList } from "@/components/boards/board-list";
import { sampleBoards } from "@/lib/sample-boards";
import { listBoards } from "@/lib/boards";
import { DatabaseError } from "@/lib/database-error";
import type { BoardSummary } from "@/types/board";
import { getAuth } from "@/lib/supabase/server";
import { SiteSidebar } from "@/components/layout/site-sidebar";
import { ChatIcon, FilmIcon } from "@/components/ui/icons";
import styles from "@/components/boards/boards.module.css";
import layout from "@/components/layout/site-layout.module.css";

type HomePageProps = {
  searchParams: Promise<{ create?: string | string[]; demo?: string | string[] }>;
};

async function getBoardFormInitialTime() {
  // 初期日時はリクエスト時に取得し、クライアントへ同じ値を渡す。
  await connection();
  return Date.now();
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { create, demo } = await searchParams;
  const showDemo = demo === "1" && create !== "1";
  const showCreateForm = create === "1";

  // 一覧の閲覧はログイン不要。作成画面を開くときだけ本人を確認する。
  if (showCreateForm) {
    const { data, error } = await getAuth();
    if (error || !data?.claims.sub) {
      const params = new URLSearchParams({ next: "/?create=1" });
      redirect(`/login?${params}`);
    }
  }

  const initialNow = await getBoardFormInitialTime();
  let boards: BoardSummary[] = [];
  let loadError = "";
  try { boards = showDemo ? sampleBoards : await listBoards(); }
  catch (error) { loadError = error instanceof DatabaseError ? error.message : "掲示板一覧を取得できませんでした。時間をおいて再読み込みしてください。"; }

  return (
    <div className={layout.layout}>
      <SiteSidebar active="boards" />
      <div className={layout.content}>
        <section className={styles.intro} aria-labelledby="page-title">
          <div className={styles.introIcon} aria-hidden="true"><FilmIcon /></div>
          <h1 id="page-title">開催中・予定の掲示板一覧</h1>
          <p className={styles.introDescription}>同じ映画を観て、感想を語ろう。</p>
          {!showCreateForm && <Link className={styles.primary} href="/?create=1"><ChatIcon />掲示板を作成する</Link>}
        </section>
        {showCreateForm && <BoardCreateForm initialNow={initialNow} />}
        {loadError ? <div className={styles.panel} role="alert"><p>{loadError}</p><Link href="/">再読み込み</Link></div>
          : <BoardList boards={boards} isSample={showDemo} initialNow={initialNow} />}
        <p><Link href={showDemo ? "/" : "/?demo=1"}>{showDemo ? "実際の掲示板一覧へ" : "サンプル画面を見る"}</Link></p>
      </div>
      <aside className={styles.guideSidebar} aria-label="ハナシネマの使い方">
        <section className={styles.guideCard}>
          <div className={styles.guideTitle}><ChatIcon /><h2>会話をはじめるには</h2></div>
          <ol className={styles.steps}>
            <li><strong>話したい映画を選ぶ</strong><p>映画のタイトルから検索できます。</p></li>
            <li><strong>定員と開始日時を決める</strong><p>どんな会話にしたいか、タイトルも添えて。</p></li>
            <li><strong>作成内容を確認する</strong><p>確認後に作成して、参加者と会話できます。</p></li>
          </ol>
        </section>
        <section className={styles.guideNote}>
          <h2>感じたことを、気軽に話そう。</h2>
          <p>同じ映画でも、感じ方は人それぞれ。お互いの感想を尊重して会話を楽しみましょう。</p>
        </section>
      </aside>
    </div>
  );
}
