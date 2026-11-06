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
  // 通常アカウントや既存のゲストを、新しい匿名ユーザーで上書きしない。
  if (!claimsError && existing?.claims.sub) redirect(next);

  let failure: string | null = null;
  try {
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
