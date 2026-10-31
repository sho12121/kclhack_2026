"use client";

import { useFormStatus } from "react-dom";

export function GuestSubmit({ isJoining = false }: { isJoining?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending}>
    {pending ? "準備しています…" : isJoining ? "ゲストで参加する" : "ゲストで掲示板を作る"}
  </button>;
}
