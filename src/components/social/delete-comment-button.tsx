"use client";
import { useState, useTransition } from "react";
import { deleteComment } from "@/app/boards/actions";
import styles from "./social.module.css";
export function DeleteCommentButton({id,onDeleted}:{id:string;onDeleted:()=>void}) {
  const [pending,startTransition] = useTransition();const [error,setError] = useState("");
  return <div><button type="button" disabled={pending} className={`${styles.button} ${styles.secondary}`} onClick={()=>{
    if (!window.confirm("このコメントを削除しますか？本文は元に戻せません。")) return;
    setError("");startTransition(async()=>{
      try {const result=await deleteComment(id);if(result.error)setError(result.error);else onDeleted();}
      catch {setError("コメントを削除できませんでした。");}
    });
  }}>{pending ? "削除中…" : "自分のコメントを削除"}</button>{error && <p className={styles.error} role="alert">{error}</p>}</div>;
}
