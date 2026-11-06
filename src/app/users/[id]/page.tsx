import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAuth } from "@/lib/supabase/server";
import { getPublicProfile, findProfiles } from "@/lib/social";
import { isUuid } from "@/lib/social-data";
import { DatabaseError } from "@/lib/database-error";
import { FollowButton } from "@/components/social/follow-button";
import styles from "@/components/social/social.module.css";
export default async function UserPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{tab?:string|string[]}>}) {
  const {id} = await params; if (!isUuid(id)) notFound();
  const auth = await getAuth(); if (auth.error || !auth.data?.claims.sub) redirect(`/login?${new URLSearchParams({next:`/users/${id}`})}`);
  const {tab} = await searchParams; const relation = tab === "following" || tab === "followers" ? tab : null;
  let profile, people; try { [profile,people] = await Promise.all([getPublicProfile(id),relation ? findProfiles("",id,relation) : Promise.resolve([])]); }
  catch (error) { return <section className={styles.page}><h1>プロフィール</h1><p role="alert">{error instanceof DatabaseError ? error.message : "プロフィールを取得できませんでした。"}</p><Link href={`/users/${id}`}>再読み込み</Link></section>; }
  if (!profile) notFound();
  return <section className={styles.page}><Link href="/users">← ユーザーを探す</Link>
    <div className={styles.card}><div className={styles.row}><h1>{profile.nickname}</h1>{id === auth.data.claims.sub ? <Link href="/account">自分のプロフィールを編集</Link> : <FollowButton userId={id} isFollowing={profile.isFollowing} isGuest={auth.data.claims.is_anonymous === true}/>}</div>
      <p className={styles.bio}>{profile.bio || "自己紹介はまだありません。"}</p>
      {profile.favoriteGenres && <p>好きなジャンル：{profile.favoriteGenres}</p>}{profile.motto && <p>{profile.motto}</p>}
      <nav className={styles.metrics} aria-label="フォロー関係"><Link href={`/users/${id}?tab=following`}>フォロー {profile.followCount}</Link><Link href={`/users/${id}?tab=followers`}>フォロワー {profile.followerCount}</Link></nav>
    </div>
    {relation && <><h2>{relation === "following" ? "フォロー中のユーザー" : "フォロワー"}</h2>{!people.length && <p>まだユーザーはいません。</p>}<ul className={styles.list}>{people.map(person=><li className={styles.card} key={person.id}><Link href={`/users/${person.id}`}>{person.nickname}</Link><p>{person.motto}</p></li>)}</ul><p className={styles.muted}>最大50人を表示しています。</p></>}
  </section>;
}
