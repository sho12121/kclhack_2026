import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthRedirect } from "@/lib/auth-redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeAuthRedirect(request.nextUrl.searchParams.get("next"));
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, request.url), { headers: { "Cache-Control": "no-store" } });
    } catch { /* 確認リンクの期限切れや別ブラウザの場合はログインへ案内する。 */ }
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("confirmation", "1");
  login.searchParams.set("next", next);
  return NextResponse.redirect(login, { headers: { "Cache-Control": "no-store" } });
}
