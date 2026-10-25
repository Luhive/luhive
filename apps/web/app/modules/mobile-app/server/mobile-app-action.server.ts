import type { ActionFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { parseUTMFromSearchParams } from "~/modules/events/utils/utm-source";
import { joinMobileAppWaitlist } from "~/modules/mobile-app/data/mobile-app-waitlist-repo.server";

export type MobileAppActionData = {
  success?: boolean;
  error?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function action({
  request,
  context,
}: ActionFunctionArgs): Promise<MobileAppActionData> {
  const { findAuthUser } = context.get(requestSupabaseContext);
  const formData = await request.formData();

  // Signed-in users are tied to their account; a submitted email is ignored.
  const user = await findAuthUser();
  const email = user ? (user.email ?? "") : readString(formData, "email");

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return { success: false, error: "Düzgün e-poçt ünvanı daxil edin." };
  }

  // The page forwards the visit's utm_* as hidden fields.
  const utmParams = new URLSearchParams();
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = readString(formData, key);
    if (value) utmParams.set(key, value.slice(0, 200));
  }

  const joined = await joinMobileAppWaitlist({
    email,
    userId: user?.id ?? null,
    utm: parseUTMFromSearchParams(utmParams),
  });

  if (!joined) {
    return {
      success: false,
      error: "Nəsə alınmadı. Bir az sonra yenidən cəhd edin.",
    };
  }

  return { success: true };
}
