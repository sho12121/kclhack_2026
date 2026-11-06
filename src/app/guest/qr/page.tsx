import { GuestEntry } from "@/components/auth/guest-entry";
import { safeAuthRedirect } from "@/lib/auth-redirect";

/** 発表用QR専用。通常の/guestはボタンによる手動開始を維持する。 */
export default async function QrGuestPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <GuestEntry next={safeAuthRedirect(params.next,"/")} autoStart errorCode={typeof params.error === "string" ? params.error : undefined}/>;
}
