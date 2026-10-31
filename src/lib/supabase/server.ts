import "server-only";
// ブラウザ側のコードから誤って読み込むのを防ぐ

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export const createClient = cache(async function createClient() {
  const cookieStore = await cookies(); //今回のアクセスで送られてきたCookieを扱う

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabaseの環境変数が設定されていません。");
  }

  return createServerClient(url, key, { //Supabaseを操作するオブジェクトを作る
    // 読み取りの再試行はreadDatabaseで1回だけ行う。SDKとの二重再試行を防ぐ。
    db: { retry: false, timeout: 10_000 },
    cookies: {
      getAll() {  //SupabaseへCookieを渡す
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {  //Supabaseが更新したCookieをブラウザへ返す
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server ComponentではCookieを書き換えられない。
          // Proxy側で更新を担当する。
        }
      },
    },
  });
});

// Reactの1回の描画中だけ共有する。別リクエストや別ユーザーとは共有しない。
export const getAuth = cache(async function getAuth() {
  const supabase = await createClient();
  return { supabase, ...await supabase.auth.getClaims() };
});
