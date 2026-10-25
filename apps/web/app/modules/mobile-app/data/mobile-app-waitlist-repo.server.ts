import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import type { UTMAttribution } from "~/modules/events/utils/utm-source";
import type { FirstFeature, Platform } from "~/modules/mobile-app/model/mobile-app-waitlist";

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
  firstFeature: FirstFeature | null;
  platform: Platform | null;
  utm: UTMAttribution;
};

/**
 * One row per person. A repeat signup keeps the original row and its first-touch
 * UTM, and only fills in the answers (and the account, if they are now signed in).
 */
export async function joinMobileAppWaitlist(input: JoinInput): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const email = normalizeWaitlistEmail(input.email);

  const { error } = await supabase.from("mobile_app_waitlist").insert({
    email,
    user_id: input.userId,
    first_feature: input.firstFeature,
    platform: input.platform,
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

  const update: {
    updated_at: string;
    first_feature?: FirstFeature;
    platform?: Platform;
    user_id?: string;
  } = { updated_at: new Date().toISOString() };
  if (input.firstFeature) update.first_feature = input.firstFeature;
  if (input.platform) update.platform = input.platform;

  // A signed-in user's row may sit under an older account email, so match the
  // account first; an anonymous row with their email is claimed otherwise.
  if (input.userId) {
    const { data: byUser, error: byUserError } = await supabase
      .from("mobile_app_waitlist")
      .update(update)
      .eq("user_id", input.userId)
      .select("id");
    if (byUserError) {
      console.error("Error updating mobile app waitlist:", byUserError);
      return false;
    }
    if (byUser.length > 0) return true;
    update.user_id = input.userId;
  }

  const { error: byEmailError } = await supabase
    .from("mobile_app_waitlist")
    .update(update)
    .eq("email", email);
  if (byEmailError) {
    console.error("Error updating mobile app waitlist:", byEmailError);
    return false;
  }
  return true;
}
