"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeAuthRedirect } from "@/lib/auth-redirect";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const requestedPath = formData.get("next");

  const next = safeAuthRedirect(requestedPath);

  // ログインに失敗しても、戻り先を維持する。
  const params = new URLSearchParams({
    error: "1",
    next,
  });
  const errorUrl = `/login?${params}`;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    redirect(errorUrl);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    redirect(errorUrl);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function logout(){
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if(error){
        throw new Error("ログアウトできませんでした。");
    }

    revalidatePath("/", "layout");
    redirect("/login");
}
