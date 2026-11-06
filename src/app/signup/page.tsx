import { safeAuthRedirect } from "@/lib/auth-redirect";
import { SignupForm } from "./signup-form";

export default async function SignupPage({ searchParams }: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <section className="auth-card"><h1>アカウント作成</h1><SignupForm next={safeAuthRedirect(params.next)} /></section>;
}
