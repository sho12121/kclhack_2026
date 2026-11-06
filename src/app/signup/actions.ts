"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeAuthRedirect } from "@/lib/auth-redirect";

export type SignupState = { error?: string; confirmationRequired?: boolean };

export async function signup(_state: SignupState, form: FormData): Promise<SignupState> {
  const email = form.get("email");
  const password = form.get("password");
  const confirmation = form.get("confirmation");
  const next = safeAuthRedirect(form.get("next"), "/account");
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { error: "メールアドレスを確認してください。" };
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return { error: "パスワードは8〜128文字で入力してください。" };
  }
  if (password !== confirmation) return { error: "確認用パスワードが一致していません。" };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { error: "アカウント登録の接続設定が完了していません。" };
  }

  let signedIn = false;
  try {
    // Server Actionで検証される送信元を使用。メールの戻り先も同じ環境にする。
    const origin = (await headers()).get("origin");
    if (!origin || !/^https?:$/.test(new URL(origin).protocol)) return { error: "画面を開き直してお試しください。" };
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("next", next);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password, options: { emailRedirectTo: callback.toString() },
    });
    if (error) {
      if (error.status === 429 || error.code === "over_email_send_rate_limit") return { error: "登録が混み合っています。時間をおいてお試しください。" };
      if (error.code === "weak_password") return { error: "パスワードがSupabaseの条件を満たしていません。別の強いパスワードを指定してください。" };
      return { error: "登録できませんでした。入力内容を確認してください。登録済みの場合はログインしてください。" };
    }
    if (!data.user) return { error: "登録できませんでした。もう一度お試しください。" };
    signedIn = Boolean(data.session);
  } catch {
    return { error: "登録先に接続できませんでした。時間をおいてお試しください。" };
  }
  if (!signedIn) return { confirmationRequired: true };
  revalidatePath("/", "layout");
  redirect(next);
}
