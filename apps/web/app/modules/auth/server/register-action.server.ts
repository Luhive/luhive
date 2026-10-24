import crypto from "crypto";
import { redirect } from "react-router";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";
import { createClient } from "~/shared/lib/supabase/server";
import { registerSchema } from "~/modules/auth/model/auth-schema";
import type { ActionFunctionArgs } from "react-router";
import { getSafeReturnTo } from "~/modules/auth/server/safe-return-to.server";
import { clearPendingAuthCookies } from "~/modules/auth/server/pending-auth-cookies.server";

const EXISTING_EMAIL_MESSAGE = "An account with this email already exists";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 600;

function appendPendingCookie(headers: Headers, name: string, value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return;

  headers.append(
    "Set-Cookie",
    `${name}=${encodeURIComponent(trimmed)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${OAUTH_COOKIE_MAX_AGE_SECONDS}`,
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createClient(request);
  const formData = await request.formData();
  const intent = (formData.get("intent") as string) || "password";
  const isModal = formData.get("_modal") === "true";

  if (intent === "oauth") {
    const provider = formData.get("provider") as "google";
    const communityId = (formData.get("communityId") as string | null)?.trim() || null;
    const eventId = (formData.get("eventId") as string | null)?.trim() || null;
    const returnTo = getSafeReturnTo(formData.get("returnTo") as string | null);
    const joinCommunity = formData.get("joinCommunity") !== "false";

    if (eventId) {
      appendPendingCookie(headers, "pending_event_id", eventId);
      appendPendingCookie(headers, "pending_event_community_id", communityId);
      appendPendingCookie(
        headers,
        "pending_event_join_community",
        joinCommunity ? "true" : "false",
      );
      appendPendingCookie(
        headers,
        "pending_event_session_id",
        formData.get("eventSessionId") as string | null,
      );
      appendPendingCookie(
        headers,
        "pending_event_utm_source",
        formData.get("eventUtmSource") as string | null,
      );
      appendPendingCookie(
        headers,
        "pending_event_utm_medium",
        formData.get("eventUtmMedium") as string | null,
      );
      appendPendingCookie(
        headers,
        "pending_event_utm_campaign",
        formData.get("eventUtmCampaign") as string | null,
      );
      appendPendingCookie(
        headers,
        "pending_event_utm_content",
        formData.get("eventUtmContent") as string | null,
      );
      appendPendingCookie(
        headers,
        "pending_event_utm_term",
        formData.get("eventUtmTerm") as string | null,
      );
      appendPendingCookie(
        headers,
        "pending_event_first_visit_started_at",
        formData.get("eventFirstVisitStartedAt") as string | null,
      );
    } else if (communityId) {
      appendPendingCookie(headers, "pending_community_id", communityId);
    }
    appendPendingCookie(headers, "pending_return_to", returnTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: new URL("/auth/verify", publicOrigin(request)).toString(),
      },
    });

    if (error) {
      return Response.json({ success: false, error: error.message }, { headers });
    }

    if (data?.url) {
      return redirect(data.url, { headers });
    }

    return Response.json(
      { success: false, error: "Unable to start OAuth flow." },
      { headers }
    );
  }

  if (intent === "check-email") {
    clearPendingAuthCookies(headers);
    await supabase.auth.signOut({ scope: "local" });

    const email = (formData.get("email") as string | null)?.trim() || "";
    if (!email) {
      return Response.json(
        { success: false, error: "Email is required." },
        { headers, status: 400 }
      );
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      return Response.json(
        { success: true, userExists: false },
        { headers }
      );
    }

    return Response.json(
      { success: true, otpSent: true, userExists: true, email },
      { headers }
    );
  }

  if (intent === "event-rsvp-signup") {
    clearPendingAuthCookies(headers);
    await supabase.auth.signOut({ scope: "local" });

    const email = (formData.get("email") as string)?.trim() || "";
    const fullName = (formData.get("fullName") as string)?.trim() || "";
    const eventId = formData.get("eventId") as string | null;
    const communityId = formData.get("communityId") as string | null;
    const joinCommunity = formData.get("joinCommunity") !== "false";

    if (!email || !fullName) {
      return Response.json(
        { success: false, error: "Full name and email are required." },
        { headers, status: 400 }
      );
    }

    const password = crypto.randomBytes(16).toString("hex");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          pending_event_id: eventId || null,
          pending_community_id: joinCommunity ? communityId : null,
          pending_return_to: null,
        },
      },
    });

    if (error) {
      const message = (error.message || "").toLowerCase();
      if (
        message.includes("already registered") ||
        message.includes("already exists") ||
        message.includes("user exists")
      ) {
        return Response.json(
          { success: false, error: EXISTING_EMAIL_MESSAGE },
          { headers }
        );
      }
      return Response.json({ success: false, error: error.message }, { headers });
    }

    const userIdentities = data.user?.identities;
    if (data.user && Array.isArray(userIdentities) && userIdentities.length === 0) {
      return Response.json(
        { success: false, error: EXISTING_EMAIL_MESSAGE },
        { headers }
      );
    }

    if (!data.user) {
      return Response.json(
        { success: false, error: "Failed to create user account" },
        { headers }
      );
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      metadata: { referral_community_id: joinCommunity ? communityId : null },
    });

    if (profileError) {
      return Response.json(
        { success: false, error: "Failed to create user account" },
        { headers }
      );
    }

    return Response.json(
      { success: true, otpSent: true, email },
      { headers }
    );
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const surname = formData.get("surname") as string;
  const communityId = formData.get("communityId") as string | null;
  const returnTo = formData.get("returnTo") as string | null;

  const validation = registerSchema.safeParse({ name, surname, email, password });

  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return Response.json(
      { success: false, errors, fieldErrors: errors },
      { headers }
    );
  }

  const fullName = `${name} ${surname}`.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Supabase "Confirm signup" email template must include {{ .Token }}
      // so users can enter the OTP code in-app at /auth/verify-otp.
      data: {
        pending_community_id: communityId || null,
        pending_return_to: returnTo || null,
        full_name: fullName,
      },
    },
  });

  if (error) {
    const message = (error.message || "").toLowerCase();
    if (
      message.includes("already registered") ||
      message.includes("already exists") ||
      message.includes("user exists")
    ) {
      return Response.json(
        { success: false, error: EXISTING_EMAIL_MESSAGE },
        { headers }
      );
    }

    return Response.json({ success: false, error: error.message }, { headers });
  }

  const userIdentities = data.user?.identities;
  if (data.user && Array.isArray(userIdentities) && userIdentities.length === 0) {
    return Response.json(
      { success: false, error: EXISTING_EMAIL_MESSAGE },
      { headers }
    );
  }

  if (!data.user) {
    return Response.json(
      { success: false, error: "Failed to create user account" },
      { headers }
    );
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    metadata: { referral_community_id: communityId },
  });

  if (profileError) {
    return Response.json(
      { success: false, error: "Failed to create user account" },
      { headers }
    );
  }

  if (!data.session) {
    if (isModal) {
      return Response.json(
        { success: true, otpSent: true, email },
        { headers }
      );
    }

    const params = new URLSearchParams({ email });
    if (communityId) {
      params.set("communityId", communityId);
    }
    if (returnTo) {
      params.set("returnTo", returnTo);
    }

    return redirect(
      `/auth/verify-otp?${params.toString()}`,
      { headers }
    );
  }

  return redirect("/hub", { headers });
}
