import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/supabase/server";
import { findProfiles } from "@/lib/social";
import { DatabaseError } from "@/lib/database-error";
import styles from "@/components/social/social.module.css";
export default async function UsersPage({searchParams}:{searchParams:Promise<{q?:string|string[]}>}) {
  const auth = await getAuth(); if (auth.error || !auth.data?.claims.sub) redirect("/login?next=/users");
  const params = await searchParams; const query = typeof params.q === "string" ? params.q.trim().slice(0,80) : "";
  let profiles; try { profiles = await findProfiles(query); }
  catch (error) { return <section className={styles.page}><h1>ユーザーを探す</h1><p role="alert">{error instanceof DatabaseError ? error.message : "ユーザーを取得できませんでした。"}</p><Link href="/users">再読み込み</Link></section>; }
  return <section className={styles.page}><Link href="/">← 掲示板一覧へ</Link><h1>ユーザーを探す</h1>
    <form className={styles.search} action="/users"><label>ニックネーム<input name="q" defaultValue={query} maxLength={80} placeholder="映画を語る仲間を探す"/></label><button className={styles.button}>検索する</button></form>
    <p className={styles.muted}>登録ユーザーを最大50人表示します。ゲストユーザーは表示されません。</p>
    {!profiles.length && <p>該当するユーザーはいません。</p>}
    <ul className={styles.list}>{profiles.map(profile=><li key={profile.id} className={styles.card}><h2><Link href={`/users/${profile.id}`}>{profile.nickname}</Link></h2><p className={styles.bio}>{profile.motto || profile.bio.slice(0,160) || "自己紹介はまだありません。"}</p><p className={styles.muted}>フォロー {profile.followCount} · フォロワー {profile.followerCount}</p></li>)}</ul>
  </section>;
}
