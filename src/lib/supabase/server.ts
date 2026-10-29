import "server-only";
// ブラウザ側のコードから誤って読み込むのを防ぐ

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies(); //今回のアクセスで送られてきたCookieを扱う

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabaseの環境変数が設定されていません。");
  }

  return createServerClient(url, key, { //Supabaseを操作するオブジェクトを作る
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
          // 後で追加するProxy側で更新を担当する。
        }
      },
    },
  });
}