"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setFollow } from "@/app/users/actions";
import styles from "./social.module.css";
export function FollowButton({ userId, isFollowing, isGuest }: { userId: string; isFollowing: boolean; isGuest: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  if (isGuest) return <Link href={`/login?${new URLSearchParams({next:`/users/${userId}`})}`}>ログインしてフォローする</Link>;
  return <div><button type="button" className={`${styles.button} ${isFollowing ? styles.secondary : ""}`} disabled={pending}
    onClick={() => { setError(""); startTransition(async () => {
      try { const result = await setFollow(userId, !isFollowing); if (result.error) setError(result.error); }
      catch { setError("フォローを変更できませんでした。もう一度お試しください。"); }
    }); }}>{pending ? "変更中…" : isFollowing ? "フォローを解除" : "フォローする"}</button>
    {error && <p role="alert" className={styles.error}>{error}</p>}</div>;
}
