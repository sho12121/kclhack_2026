import Link from "next/link";
import { redirect } from "next/navigation";
import { BoardCreateForm } from "@/components/boards/board-create-form";
import { BoardList } from "@/components/boards/board-list";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/boards/boards.module.css";

type HomePageProps = {
  searchParams: Promise<{ create?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { create } = await searchParams;
  const showCreateForm = create === "1";

  // 一覧の閲覧はログイン不要。作成画面を開くときだけ本人を確認する。
  if (showCreateForm) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims.sub) {
      const params = new URLSearchParams({ next: "/?create=1" });
      redirect(`/login?${params}`);
    }
  }

  return (
    <>
      <section className={styles.intro} aria-labelledby="page-title">
        <p className="eyebrow">A FILM. A FEELING. A CONVERSATION.</p>
        <h1 id="page-title">映画について、話そう。</h1>
        <p>気になる映画の掲示板を探して、人数と時間を区切った会話を。</p>
        {!showCreateForm && <Link className={styles.primary} href="/?create=1">掲示板を作成</Link>}
      </section>
      {showCreateForm && <BoardCreateForm />}
      {/* DB保存は次の段階で接続する。今は空の一覧を表示。 */}
      <BoardList boards={[]} />
    </>
  );
}
