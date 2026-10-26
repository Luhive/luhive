import type { ActionFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { parseUTMFromSearchParams } from "~/modules/events/utils/utm-source";
import { parseFeature } from "~/modules/mobile-app/model/mobile-app-waitlist";
import {
  countSubscribed,
  joinWaitlist,
  saveFeatureAnswer,
} from "~/modules/mobile-app/data/mobile-app-waitlist-repo.server";
import {
  resubscribeContact,
  welcomeNewSignup,
} from "~/modules/mobile-app/server/mobile-app-welcome.server";

export type MobileAppActionData =
  | { intent: "join"; ok: true; signupId: string; subscribedCount: number; isNew: boolean }
  | { intent: "join"; ok: false; reason: "invalid_email" | "server"; error: string }
  | { intent: "answer"; ok: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function action({
  request,
  context,
}: ActionFunctionArgs): Promise<MobileAppActionData> {
  const formData = await request.formData();

  if (readString(formData, "intent") === "answer") {
    const signupId = readString(formData, "signupId");
    const feature = parseFeature(formData.get("feature"));
    const ok = Boolean(signupId && feature) && (await saveFeatureAnswer(signupId, feature!));
    return { intent: "answer", ok };
  }

  // Honeypot: bots fill every field. Pretend it worked and store nothing.
  if (readString(formData, "company")) {
    return { intent: "join", ok: true, signupId: "", subscribedCount: await countSubscribed(), isNew: false };
  }

  // Signed-in users are tied to their account; a submitted email is ignored.
  const { findAuthUser } = context.get(requestSupabaseContext);
  const user = await findAuthUser();
  const email = user ? (user.email ?? "") : readString(formData, "email");

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return {
      intent: "join",
      ok: false,
      reason: "invalid_email",
      error: "Please enter a valid email address.",
    };
  }

  // The page forwards the visit's utm_* as hidden fields.
  const utmParams = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = readString(formData, key);
    if (value) utmParams.set(key, value.slice(0, 200));
  }

  const result = await joinWaitlist({
    email,
    userId: user?.id ?? null,
    utm: parseUTMFromSearchParams(utmParams),
  });

  if (result.status === "error") {
    return {
      intent: "join",
      ok: false,
      reason: "server",
      error: "Something went wrong. Please try again in a moment.",
    };
  }

  if (result.status === "created") {
    await welcomeNewSignup(result.id, email);
  } else if (result.resubscribed) {
    await resubscribeContact(email);
  }

  return {
    intent: "join",
    ok: true,
    signupId: result.id,
    subscribedCount: await countSubscribed(),
    isNew: result.status === "created" || result.resubscribed,
  };
}
