import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    // 公開ページは閲覧可能にする。認証が必要なページでは別途接続を確認する。
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet, headers) {
        // この後のサーバー処理にも、更新したCookieを渡す。
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        // ブラウザにも、更新したCookieを返す。
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        // ログイン情報を含む応答がキャッシュされないようにする。
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login/:path*",
    "/signup/:path*",
    "/auth/:path*",
    "/guest/:path*",
    "/account/:path*",
    "/users/:path*",
    "/notifications/:path*",
    "/api/notifications/:path*",
    "/boards/:path*",
    "/api/boards",
    "/api/boards/:path*",
    "/playground/:path*",
  ],
};
