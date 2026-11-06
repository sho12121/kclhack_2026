"use client";

import { useFormStatus } from "react-dom";

export function GuestSubmit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending}>
    {pending ? "準備しています…" : "ゲストとして開始"}
  </button>;
}
