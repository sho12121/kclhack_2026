import { GuestEntry } from "@/components/auth/guest-entry";
import { safeAuthRedirect } from "@/lib/auth-redirect";
export default async function GuestPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <GuestEntry next={safeAuthRedirect(params.next,"/?create=1")} errorCode={typeof params.error === "string" ? params.error : undefined}/>;
}
