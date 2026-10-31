import Link from "next/link";
import { redirect } from "next/navigation";
import { BoardCreateForm } from "@/components/boards/board-create-form";
import { BoardList } from "@/components/boards/board-list";
import { createClient } from "@/lib/supabase/server";
import { SiteSidebar } from "@/components/layout/site-sidebar";
import { CalendarIcon, ChatIcon, FilmIcon, UsersIcon } from "@/components/ui/icons";
import styles from "@/components/boards/boards.module.css";
import layout from "@/components/layout/site-layout.module.css";

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
    <div className={layout.layout}>
      <SiteSidebar active="boards" />
      <div className={layout.content}>
        <section className={styles.intro} aria-labelledby="page-title">
          <div className={styles.introIcon} aria-hidden="true"><FilmIcon /></div>
          <p className={styles.eyebrow}>映画でつながる、会話の場所</p>
          <h1 id="page-title">映画の余韻を、<br />誰かと話す時間に。</h1>
          <p className={styles.introDescription}>心に残ったシーンも、ラストの解釈も。<br />好きな映画を囲んで、小さな会話をはじめよう。</p>
          <div className={styles.introTags}>
            <span><UsersIcon />人数を決めて</span>
            <span><CalendarIcon />時間を区切って</span>
          </div>
          {!showCreateForm && <Link className={styles.primary} href="/?create=1"><ChatIcon />掲示板を作成する</Link>}
        </section>
        {showCreateForm && <BoardCreateForm />}
        {/* DB保存は次の段階で接続する。今は空の一覧を表示。 */}
        <BoardList boards={[]} />
      </div>
      <aside className={styles.guideSidebar} aria-label="ハナシネマの使い方">
        <section className={styles.guideCard}>
          <div className={styles.guideTitle}><ChatIcon /><h2>会話をはじめるには</h2></div>
          <ol className={styles.steps}>
            <li><strong>話したい映画を選ぶ</strong><p>映画のタイトルから検索できます。</p></li>
            <li><strong>人数と時間を決める</strong><p>どんな会話にしたいか、タイトルも添えて。</p></li>
            <li><strong>作成内容を確認する</strong><p>いまは入力内容の確認まで試せます。</p></li>
          </ol>
        </section>
        <section className={styles.guideNote}>
          <h2>あなたの「話したい」を大切に。</h2>
          <p>同じ映画でも、感じ方は人それぞれ。お互いの感想を尊重して会話を楽しみましょう。</p>
        </section>
      </aside>
    </div>
  );
}
