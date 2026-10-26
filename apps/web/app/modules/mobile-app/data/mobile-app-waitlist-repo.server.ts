import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import type { UTMAttribution } from "~/modules/events/utils/utm-source";
import { COUNTER_BASE, type Feature } from "~/modules/mobile-app/model/mobile-app-waitlist";

const UNIQUE_VIOLATION = "23505";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const ROW_COLUMNS = "id, first_feature, user_id, unsubscribed_at";

export type WaitlistRow = {
  id: string;
  first_feature: string | null;
  user_id: string | null;
  unsubscribed_at: string | null;
};

/** "N people subscribed": real signups that have not unsubscribed, plus the display offset. */
export async function countSubscribed(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("mobile_app_waitlist")
    .select("id", { count: "exact", head: true })
    .is("unsubscribed_at", null);
  if (error) console.error("Error counting mobile app waitlist:", error);
  return COUNTER_BASE + (count ?? 0);
}

export async function findForUser(
  userId: string,
  email: string | undefined,
): Promise<WaitlistRow | null> {
  const supabase = createServiceRoleClient();
  const { data: byUser } = await supabase
    .from("mobile_app_waitlist")
    .select(ROW_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (byUser || !email) return byUser;

  const { data: byEmail } = await supabase
    .from("mobile_app_waitlist")
    .select(ROW_COLUMNS)
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  return byEmail;
}

type JoinInput = {
  email: string;
  userId: string | null;
  utm: UTMAttribution;
};

export type JoinResult =
  | { status: "created"; id: string }
  | { status: "existing"; id: string; resubscribed: boolean }
  | { status: "error" };

/**
 * One row per person. A repeat signup keeps the original row and its first-touch
 * UTM. It links the account when an anonymous signup is now signed in, and clears
 * an earlier unsubscribe.
 */
export async function join(input: JoinInput): Promise<JoinResult> {
  const supabase = createServiceRoleClient();
  const email = normalizeEmail(input.email);

  const { data: created, error } = await supabase
    .from("mobile_app_waitlist")
    .insert({
      email,
      user_id: input.userId,
      utm_source: input.utm.utmSource,
      utm_medium: input.utm.utmMedium,
      utm_campaign: input.utm.utmCampaign,
      utm_content: input.utm.utmContent,
      utm_term: input.utm.utmTerm,
    })
    .select("id")
    .single();

  if (created) return { status: "created", id: created.id };
  if (error?.code !== UNIQUE_VIOLATION) {
    console.error("Error joining mobile app waitlist:", error);
    return { status: "error" };
  }

  // A signed-in user's row may sit under an older account email, so match the
  // account first; otherwise the row with this email.
  const existing = input.userId
    ? await findForUser(input.userId, email)
    : (
        await supabase
          .from("mobile_app_waitlist")
          .select(ROW_COLUMNS)
          .eq("email", email)
          .maybeSingle()
      ).data;
  if (!existing) return { status: "error" };

  const resubscribed = Boolean(existing.unsubscribed_at);
  const linkAccount = Boolean(input.userId && !existing.user_id);

  if (resubscribed || linkAccount) {
    const { error: updateError } = await supabase
      .from("mobile_app_waitlist")
      .update({
        ...(resubscribed && { unsubscribed_at: null }),
        ...(linkAccount && { user_id: input.userId }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updateError) console.error("Error updating mobile app waitlist:", updateError);
  }

  return { status: "existing", id: existing.id, resubscribed };
}

export async function markWelcomeSent(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("mobile_app_waitlist")
    .update({
      welcome_sent_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) console.error("Error marking mobile app welcome sent:", error);
}

export async function saveFeatureAnswer(id: string, feature: Feature): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("mobile_app_waitlist")
    .update({ first_feature: feature, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) console.error("Error saving mobile app feature answer:", error);
  return !error && data.length > 0;
}
