"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setBoardFavorite } from "@/app/boards/actions";
import { HeartIcon } from "@/components/ui/icons";
import styles from "./favorite-button.module.css";

export function FavoriteButton({ boardId, initialFavorite = false, onChange }: {
  boardId: string; initialFavorite?: boolean; onChange?: (favorite: boolean) => void;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <div className={styles.wrapper}>
    <button type="button" className={styles.button} aria-pressed={favorite} disabled={pending}
      onClick={() => {
        setError("");
        startTransition(async () => {
          try {
            const result = await setBoardFavorite(boardId, !favorite);
            if (result.error) { setError(result.error); return; }
            setFavorite(!favorite); onChange?.(!favorite);
          } catch { setError("お気に入りを更新できませんでした。再度お試しください。"); }
        });
      }}><span aria-hidden="true"><HeartIcon /></span>{pending ? "更新中…" : favorite ? "お気に入り登録済み" : "お気に入りに登録"}</button>
    {error && <p role="alert" className={styles.error}>{error} <Link href={`/login?${new URLSearchParams({next:`/boards/${boardId}`})}`}>ログイン</Link></p>}
  </div>;
}
