"use client";
import { useEffect, useRef } from "react";

/** ブラウザで実際に開いた時だけPOSTする。GETやリンクの先読みではゲストを作らない。 */
export function AutoGuestStart({ enabled }: { enabled: boolean }) {
  const marker = useRef<HTMLSpanElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (!enabled || submitted.current) return;
    const form = marker.current?.closest("form");
    if (!form) return;
    // Strict ModeのEffect再実行でも二重送信しない。
    submitted.current = true;
    form.requestSubmit();
  }, [enabled]);
  return <span ref={marker} hidden/>;
}
