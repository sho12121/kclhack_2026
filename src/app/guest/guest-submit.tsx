"use client";

import { useFormStatus } from "react-dom";

export function GuestSubmit({ isJoining = false, isBrowsing = false }: { isJoining?: boolean; isBrowsing?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending}>
    {pending ? "準備しています…" : isJoining ? "ゲストで参加する" : isBrowsing ? "ゲストで利用する" : "ゲストで掲示板を作る"}
  </button>;
}
