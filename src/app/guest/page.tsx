import { GuestEntry } from "@/components/auth/guest-entry";
import { safeAuthRedirect } from "@/lib/auth-redirect";
export default async function GuestPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedNext = safeAuthRedirect(params.next, "/");
  const next = requestedNext === "/?create=1" ? "/" : requestedNext;
  return <GuestEntry next={next} errorCode={typeof params.error === "string" ? params.error : undefined}/>;
}
