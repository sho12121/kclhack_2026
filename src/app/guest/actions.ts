"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeAuthRedirect } from "@/lib/auth-redirect";

/** ゲスト発行はPOSTだけ。QR入口ではブラウザ側がこのフォームを自動送信する。 */
export async function startGuest(form: FormData) {
  const next = safeAuthRedirect(form.get("next"), "/?create=1");
  const entry = form.get("entry") === "qr" ? "/guest/qr" : "/guest";
  const errorPath = (error: string) => `${entry}?${new URLSearchParams({ error, next })}`;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect(errorPath("configuration"));
  }
  const supabase = await createClient();
  const { data: existing, error: claimsError } = await supabase.auth.getClaims();
  // QRでは通常アカウントからゲストへ切り替える。手動入口と既存ゲストは再利用する。
  if (!claimsError && existing?.claims.sub && (entry !== "/guest/qr" || existing.claims.is_anonymous === true)) redirect(next);

  let failure: string | null = null;
  try {
    // 先にsignOutしない。ゲスト発行に失敗した場合は元のログインを維持する。
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: "ゲスト" } },
    });
    if (error || !data.user || !data.session) {
      failure = error?.code === "anonymous_provider_disabled" ? "disabled"
        : error?.status === 429 ? "limit" : "unavailable";
    }
  } catch {
    failure = "unavailable";
  }
  if (failure) redirect(errorPath(failure));
  revalidatePath("/", "layout");
  redirect(next);
}
