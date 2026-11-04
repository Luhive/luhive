import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { Routes } from "~/shared/lib/routing/routes";
import { createClient, createServiceRoleClient } from "~/shared/lib/supabase/server";
import { notifyCommunityJoin } from "~/modules/community/server/notify-community-join.server";
import { normalizeUtmSource } from "~/modules/events/utils/utm-source";
import { fetchEventPageUserState } from "~/modules/events/server/fetch-event-page-user-state.server";
import type { EventPageUserState } from "~/modules/events/model/event-detail-view.types";
import type { Profile } from "~/shared/models/entity.types";
import {
  PUBLIC_COMMUNITY_COLUMNS,
  PUBLIC_EVENT_COLUMNS,
} from "~/modules/events/server/resolve-public-event.server";
import { completeEventRegistration } from "~/modules/events/server/complete-event-registration.server";

const OTP_LENGTH = 6;

function getSafeReturnTo(returnTo: string | null): string | null {
  if (!returnTo) {
    return null;
  }

  return returnTo.startsWith("/") ? returnTo : null;
}

function withJoinedQuery(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}joined=true`;
}

async function buildOtpModalSuccessResponse(
  supabase: ReturnType<typeof createClient>["supabase"],
  user: { id: string; email?: string | null },
  opts: {
    joined: boolean;
    communitySlug: string | null;
    registeredEvent: boolean;
    eventId: string | null;
    registrationCommunityId: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    headers: Headers;
  },
) {
  const serviceClient = createServiceRoleClient();
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let registrationState: EventPageUserState | undefined;
  if (opts.eventId && opts.registrationCommunityId) {
    registrationState = await fetchEventPageUserState(
      supabase,
      serviceClient,
      opts.eventId,
      opts.registrationCommunityId,
    );
  }

  return Response.json(
    {
      success: true,
      joined: opts.joined,
      communitySlug: opts.communitySlug,
      registeredEvent: opts.registeredEvent,
      fullName: opts.fullName ?? userProfile?.full_name ?? null,
      avatarUrl: opts.avatarUrl ?? userProfile?.avatar_url ?? null,
      userId: user.id,
      email: user.email ?? null,
      userProfile: (userProfile as Profile | null) ?? null,
      registrationState,
      isCommunityMember:
        registrationState?.isCommunityMember ?? opts.joined,
    },
    { headers: opts.headers },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createClient(request);
  const formData = await request.formData();

  const intent = (formData.get("intent") as string) || "verify";
  const isModal = formData.get("_modal") === "true";
  const email = (formData.get("email") as string | null)?.trim() || "";
  const communityId = (formData.get("communityId") as string | null)?.trim() || null;
  const returnTo = getSafeReturnTo(
    ((formData.get("returnTo") as string | null) || "").trim() || null
  );

  if (!email) {
    return Response.json(
      { success: false, error: "Email is required." },
      { headers, status: 400 }
    );
  }

  if (intent === "resend") {
    if (isModal) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) {
        return Response.json(
          { success: false, error: error.message },
          { headers, status: 400 }
        );
      }
      return Response.json({ success: true, message: "A new code was sent." }, { headers });
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { headers, status: 400 }
      );
    }

    return Response.json({ success: true, message: "A new code was sent." }, { headers });
  }

  const token = ((formData.get("token") as string | null) || "")
    .trim()
    .replace(/\s/g, "");

  if (!/^\d+$/.test(token) || token.length !== OTP_LENGTH) {
    return Response.json(
      { success: false, error: "Enter a valid 6-digit code." },
      { headers, status: 400 }
    );
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data.user) {
    const message = (error?.message || "").toLowerCase();
    const isInvalid =
      message.includes("invalid") ||
      message.includes("incorrect") ||
      message.includes("wrong");
    const isExpired = message.includes("expired") && !isInvalid;
    const isTooManyAttempts =
      message.includes("too many") || message.includes("over_email_send_rate_limit");

    return Response.json(
      {
        success: false,
        error: isTooManyAttempts
          ? "Too many attempts. Please request a new code."
          : isExpired
            ? "This code has expired. Request a new one."
            : "Invalid verification code.",
        code: isTooManyAttempts ? "too-many-attempts" : isExpired ? "expired" : "invalid",
      },
      { headers, status: 400 }
    );
  }

  const skipCommunity = formData.get("joinCommunity") === "false";
  const referralCommunityId = skipCommunity
    ? null
    : (communityId ||
        (data.user.user_metadata?.pending_community_id as string | undefined) ||
        null);
  const metadataReturnTo = getSafeReturnTo(
    (data.user.user_metadata?.pending_return_to as string | undefined) || null
  );
  const resolvedReturnTo = returnTo || metadataReturnTo;
  let joined = false;
  let communitySlug: string | null = null;

  const submittedFullName = (formData.get("fullName") as string | null)?.trim() || null;

  // Event RSVP flow: create profile if fullName provided and none exists
  if (submittedFullName) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!existingProfile) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: submittedFullName,
      });
    }
  }

  // Event RSVP flow: register for event if eventId provided
  const eventId = (formData.get("eventId") as string | null)?.trim();
  const eventSessionId =
    (formData.get("eventSessionId") as string | null)?.trim() || null;
  const eventUtmSource = normalizeUtmSource(
    (formData.get("eventUtmSource") as string | null)?.trim() || null,
  );
  const eventUtmMedium =
    (formData.get("eventUtmMedium") as string | null)?.trim() || null;
  const eventUtmCampaign =
    (formData.get("eventUtmCampaign") as string | null)?.trim() || null;
  const eventUtmContent =
    (formData.get("eventUtmContent") as string | null)?.trim() || null;
  const eventUtmTerm =
    (formData.get("eventUtmTerm") as string | null)?.trim() || null;
  const eventFirstVisitStartedAt =
    (formData.get("eventFirstVisitStartedAt") as string | null)?.trim() || null;

  let registeredEvent = false;
  let registeredEventCommunityId: string | null = null;
  let eventRegistrationCommunityId: string | null = null;
  if (eventId) {
    const customAnswersStr = formData.get("customAnswers") as string | null;
    let customAnswers: Record<string, unknown> | null = null;
    if (customAnswersStr) {
      try {
        customAnswers = JSON.parse(customAnswersStr) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
    }

    const [{ data: event }, { data: sourceCommunity }] = await Promise.all([
      supabase
        .from("events")
        .select(PUBLIC_EVENT_COLUMNS)
        .eq("id", eventId)
        .single(),
      communityId
        ? supabase
            .from("communities")
            .select(PUBLIC_COMMUNITY_COLUMNS)
            .eq("id", communityId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (event) {
      eventRegistrationCommunityId = communityId || event.community_id;
      const hasCustomQuestions = !!event.custom_questions;
      const shouldRegisterNow = !hasCustomQuestions || customAnswers !== null;

      if (shouldRegisterNow) {
        const registrationResult = await completeEventRegistration({
          request,
          supabase,
          user: data.user,
          event: event as import("~/shared/models/entity.types").Event,
          community: sourceCommunity as import("~/shared/models/entity.types").Community | null,
          sourceCommunityId: communityId || event.community_id,
          joinCommunity: false,
          customAnswers,
          tracking: {
            sessionId: eventSessionId,
            utmSource: eventUtmSource,
            utmMedium: eventUtmMedium,
            utmCampaign: eventUtmCampaign,
            utmContent: eventUtmContent,
            utmTerm: eventUtmTerm,
            firstVisitStartedAt: eventFirstVisitStartedAt,
          },
          duplicateMode: "success",
          submittedFullName,
          teamCode: (formData.get("teamCode") as string | null) || null,
          teamInviteId: (formData.get("teamInviteId") as string | null) || null,
        });

        if (!registrationResult.success) {
          return Response.json(
            {
              success: false,
              error:
                registrationResult.error ||
                "Failed to create registration. Please try again.",
            },
            { headers, status: 400 },
          );
        }

        registeredEvent = Boolean(
          registrationResult.registrationState?.isUserRegistered ||
            registrationResult.alreadyRegistered,
        );
        registeredEventCommunityId =
          registrationResult.registeredEventCommunityId ?? event.community_id;
      }
    }
  }

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", data.user.id)
    .maybeSingle();
  const fullName = userProfile?.full_name ?? null;
  const avatarUrl = userProfile?.avatar_url ?? null;

  if (referralCommunityId) {
    const { data: existingMember } = await supabase
      .from("community_members")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("community_id", referralCommunityId)
      .single();

    if (!existingMember) {
      await supabase.from("community_members").insert({
        user_id: data.user.id,
        community_id: referralCommunityId,
        role: "member",
      });

      // Skip community join notification when the join was driven by an event
      // registration for the same community — admins already got the event email.
      const skipCommunityNotify =
        registeredEvent && registeredEventCommunityId === referralCommunityId;

      // Notify community owner/admins about new member
      if (!skipCommunityNotify) {
        const { data: memberProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .maybeSingle();

        await notifyCommunityJoin({
          supabase,
          communityId: referralCommunityId,
          memberUserId: data.user.id,
          memberEmail: data.user.email ?? null,
          memberName:
            memberProfile?.full_name ||
            submittedFullName ||
            data.user.email?.split("@")[0] ||
            "A new member",
        });
      }
    }

    const { data: community } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", referralCommunityId)
      .single();

    if (community) {
      joined = true;
      communitySlug = community.slug;

      if (isModal) {
        return buildOtpModalSuccessResponse(supabase, data.user, {
          joined,
          communitySlug,
          registeredEvent,
          eventId: eventId ?? null,
          registrationCommunityId: eventRegistrationCommunityId,
          fullName,
          avatarUrl,
          headers,
        });
      }

      const destination = resolvedReturnTo ?? Routes.community.detail(community.slug);
      return redirect(withJoinedQuery(destination), { headers });
    }
  }

  if (isModal) {
    return buildOtpModalSuccessResponse(supabase, data.user, {
      joined,
      communitySlug,
      registeredEvent,
      eventId: eventId ?? null,
      registrationCommunityId: eventRegistrationCommunityId,
      fullName,
      avatarUrl,
      headers,
    });
  }

  if (resolvedReturnTo) {
    return redirect(resolvedReturnTo, { headers });
  }

  const { data: ownedCommunity } = await supabase
    .from("communities")
    .select("slug")
    .eq("created_by", data.user.id)
    .single();

  if (ownedCommunity) {
    return redirect(Routes.community.detail(ownedCommunity.slug), { headers });
  }

  return redirect("/hub", { headers });
}
