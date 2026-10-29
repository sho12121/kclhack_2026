"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const requestedPath = formData.get("next");

  // 今あるページだけを、戻り先として許可する。
  const allowedPaths = ["/", "/account", "/?create=1"];

  const next =
    typeof requestedPath === "string" &&
    allowedPaths.includes(requestedPath)
      ? requestedPath
      : "/account";

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

  redirect(next);
}

export async function logout(){
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if(error){
        throw new Error("ログアウトできませんでした。");
    }

    redirect("/login");
}
