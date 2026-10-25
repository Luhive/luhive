import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import type { UTMAttribution } from "~/modules/events/utils/utm-source";

const UNIQUE_VIOLATION = "23505";

export function normalizeWaitlistEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isOnMobileAppWaitlist(
  userId: string,
  email: string | undefined,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data: byUser } = await supabase
    .from("mobile_app_waitlist")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (byUser?.length) return true;
  if (!email) return false;

  const { data: byEmail } = await supabase
    .from("mobile_app_waitlist")
    .select("id")
    .eq("email", normalizeWaitlistEmail(email))
    .limit(1);
  return (byEmail?.length ?? 0) > 0;
}

type JoinInput = {
  email: string;
  userId: string | null;
  utm: UTMAttribution;
};

/**
 * One row per person. A repeat signup keeps the original row and its first-touch
 * UTM, and only links the account if they are now signed in.
 */
export async function joinMobileAppWaitlist(input: JoinInput): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const email = normalizeWaitlistEmail(input.email);

  const { error } = await supabase.from("mobile_app_waitlist").insert({
    email,
    user_id: input.userId,
    utm_source: input.utm.utmSource,
    utm_medium: input.utm.utmMedium,
    utm_campaign: input.utm.utmCampaign,
    utm_content: input.utm.utmContent,
    utm_term: input.utm.utmTerm,
  });

  if (!error) return true;
  if (error.code !== UNIQUE_VIOLATION) {
    console.error("Error joining mobile app waitlist:", error);
    return false;
  }

  // Already on the list. The only thing to record is the account, when an
  // anonymous signup is now signed in; the first-touch UTM is never touched.
  if (input.userId) {
    const { error: claimError } = await supabase
      .from("mobile_app_waitlist")
      .update({ user_id: input.userId, updated_at: new Date().toISOString() })
      .eq("email", email)
      .is("user_id", null);
    if (claimError) {
      console.error("Error updating mobile app waitlist:", claimError);
      return false;
    }
  }
  return true;
}
