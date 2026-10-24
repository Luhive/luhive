import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import type { Database } from "~/shared/models/database.types";
import type { Community, Event } from "~/shared/models/entity.types";
import type { EventRegistrationState } from "~/modules/events/model/event-detail-view.types";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { GoogleMaps } from "~/modules/events/utils/google-maps";
import { sanitizeDuplicateError } from "~/modules/events/utils/sanitize-error";
import { getIpLocation } from "~/shared/lib/ip-location.server";
import { ensureCommunityMembership } from "~/modules/community/server/join-community.server";
import { getApprovedRegistrationCount } from "~/modules/events/data/registrations-repo.server";
import { computeCanRegister } from "~/modules/events/server/fetch-event-page-user-state.server";
import { normalizeUtmSource } from "~/modules/events/utils/utm-source";
import { sendRegistrationAttendeeEmail } from "~/modules/events/server/send-registration-attendee-email.server";
import { sendRegistrationOrganizerNotifications } from "~/modules/events/server/send-registration-notification.server";
import { isPaidEvent } from "~/modules/events/utils/event-price-label";
import { buildEventReturnUrl } from "~/modules/events/utils/event-return-url";
import { findTicketOrderByRegistrationId } from "~/modules/events/data/ticket-orders-repo.server";
import { isPaidTicketingEnabledForCommunity } from "~/modules/events/server/is-paid-ticketing-enabled-for-community.server";
import { requestRegistrationPayment } from "~/modules/events/server/payments/request-registration-payment.server";
import { sendPaymentRequestEmails } from "~/modules/events/server/payments/send-payment-request-emails.server";
import * as CommunitySettings from "@luhive/domain/v1/community-settings";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

dayjs.extend(utc);
dayjs.extend(timezone);

type DbClient = SupabaseClient<Database>;

type EventRegistrationUser = {
  id: string;
  email?: string | null;
};

export type EventRegistrationTrackingInput = {
  sessionId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  firstVisitStartedAt?: string | null;
};

type CompleteEventRegistrationOptions = {
  request: Request;
  supabase: DbClient;
  user: EventRegistrationUser;
  event: Event;
  community?: Community | null;
  sourceCommunityId?: string | null;
  joinCommunityId?: string | null;
  joinCommunity?: boolean;
  customAnswers?: Record<string, unknown> | null;
  tracking?: EventRegistrationTrackingInput;
  duplicateMode?: "error" | "success";
  submittedFullName?: string | null;
};

export type CompleteEventRegistrationResult = {
  success: boolean;
  error?: string;
  message?: string;
  alreadyRegistered?: boolean;
  /** Set when the registration is waiting for an online payment; send the user here. */
  paymentUrl?: string | null;
  registrationState?: EventRegistrationState & { canRegister?: boolean };
  registeredEventCommunityId?: string | null;
};

function getTimeToRegisterSeconds(startedAt: string | null): number | null {
  if (!startedAt) return null;

  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) return null;

  return Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000));
}

function closedRegistrationMessage(event: Event, registrationCount: number) {
  if (event.status !== "published") {
    return "This event is not open for registration.";
  }

  const registrationDeadline = event.registration_deadline
    ? new Date(event.registration_deadline)
    : new Date(event.start_time);

  if (Date.now() >= registrationDeadline.getTime()) {
    return "Registration for this event has closed.";
  }

  if (event.capacity && registrationCount >= event.capacity) {
    return "This event is at full capacity.";
  }

  return "You cannot register for this event right now.";
}

async function resolveCommunity(
  supabase: DbClient,
  event: Event,
  community?: Community | null,
): Promise<Community | null> {
  if (community) return community;

  const { data } = await supabase
    .from("communities")
    .select("id, name, slug, logo_url, created_by, description, tagline, cover_url, verified, is_show, social_links")
    .eq("id", event.community_id)
    .maybeSingle();

  return (data as Community | null) ?? null;
}

async function getEventReturnUrl(
  request: Request,
  supabase: DbClient,
  event: Event,
  community?: Community | null,
): Promise<string | undefined> {
  const resolved = await resolveCommunity(supabase, event, community);
  if (!resolved) return undefined;

  return buildEventReturnUrl(publicOrigin(request), resolved.slug, event);
}

export async function completeEventRegistration({
  request,
  supabase,
  user,
  event,
  community,
  sourceCommunityId,
  joinCommunityId,
  joinCommunity = true,
  customAnswers = null,
  tracking,
  duplicateMode = "error",
  submittedFullName,
}: CompleteEventRegistrationOptions): Promise<CompleteEventRegistrationResult> {
  if (event.registration_type === "external") {
    return {
      success: false,
      error: "This event does not support registration on Luhive",
    };
  }

  const isPaid = isPaidEvent(event);
  if (
    isPaid &&
    !(await isPaidTicketingEnabledForCommunity(supabase, event.community_id))
  ) {
    return {
      success: false,
      error: "Paid tickets are not available for this event right now.",
    };
  }

  const serviceClient = createServiceRoleClient();
  const registrationCount = await getApprovedRegistrationCount(
    serviceClient,
    event.id,
  );

  const { data: existingRegistration } = await supabase
    .from("event_registrations")
    .select("id, approval_status, checkin_token")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingRegistration) {
    const registrationState: EventRegistrationState = {
      isUserRegistered: true,
      userRegistrationStatus: existingRegistration.approval_status,
      userCheckinToken: existingRegistration.checkin_token,
      registrationCount,
    };

    if (isPaid && existingRegistration.approval_status === "pending") {
      const order = await findTicketOrderByRegistrationId(existingRegistration.id);
      if (order?.status === "pending") {
        return requestRegistrationPayment({
          event,
          registrationId: existingRegistration.id,
          registrationCount,
          existingOrder: order,
          eventReturnUrl: await getEventReturnUrl(request, supabase, event, community),
        });
      }
    }

    if (duplicateMode === "success") {
      return {
        success: true,
        message: "You are already registered for this event.",
        alreadyRegistered: true,
        registrationState,
        registeredEventCommunityId: event.community_id,
      };
    }

    return {
      success: false,
      error: "You are already registered for this event",
      registrationState,
      registeredEventCommunityId: event.community_id,
    };
  }

  if (user.email) {
    const { data: existingAnonymousRegistration } = await supabase
      .from("event_registrations")
      .select("id, is_verified")
      .eq("event_id", event.id)
      .eq("anonymous_email", user.email)
      .maybeSingle();

    if (existingAnonymousRegistration) {
      return {
        success: false,
        error: "This email is already registered for this event",
      };
    }
  }

  if (!computeCanRegister(event, registrationCount, false)) {
    return {
      success: false,
      error: closedRegistrationMessage(event, registrationCount),
      registrationState: {
        isUserRegistered: false,
        userRegistrationStatus: null,
        userCheckinToken: null,
        registrationCount,
        canRegister: false,
      },
    };
  }

  if (event.custom_questions) {
    if (!customAnswers) {
      return {
        success: false,
        error: "Please fill in all required fields",
      };
    }

    const { validateCustomAnswers } = await import(
      "~/modules/events/utils/custom-questions"
    );
    const validation = validateCustomAnswers(
      customAnswers as import("~/modules/events/model/event.types").CustomAnswerJson,
      event.custom_questions as unknown as import("~/modules/events/model/event.types").CustomQuestionJson,
    );
    if (!validation.valid) {
      return {
        success: false,
        error: "Please fill in all required fields",
      };
    }
  }

  const resolvedCommunity = await resolveCommunity(supabase, event, community);
  // Payment is the gate for paid events; approval is granted when it clears.
  const approvalStatus =
    isPaid || event.is_approve_required ? "pending" : "approved";
  const checkinToken = approvalStatus === "approved" ? crypto.randomUUID() : null;
  const registrationLocation = await getIpLocation(request);

  let registrationSessionId = tracking?.sessionId?.trim() || null;
  let registrationIp: string | null = registrationLocation.ip;
  let registrationCountry: string | null = registrationLocation.country;
  let registrationCity: string | null = registrationLocation.city;
  let timeToRegisterSeconds = getTimeToRegisterSeconds(
    tracking?.firstVisitStartedAt?.trim() || null,
  );
  let utmSource = normalizeUtmSource(tracking?.utmSource?.trim() || null);
  let utmMedium = tracking?.utmMedium?.trim() || null;
  let utmCampaign = tracking?.utmCampaign?.trim() || null;
  let utmContent = tracking?.utmContent?.trim() || null;
  let utmTerm = tracking?.utmTerm?.trim() || null;

  let firstVisitQuery = (supabase as any)
    .from("event_visits")
    .select(
      "visited_at, session_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ip, country, city",
    )
    .eq("event_id", event.id)
    .order("visited_at", { ascending: true })
    .limit(1);

  if (registrationSessionId) {
    firstVisitQuery = firstVisitQuery.eq("session_id", registrationSessionId);
  } else {
    firstVisitQuery = firstVisitQuery.eq("user_id", user.id);
  }

  const { data: firstVisitRows } = await firstVisitQuery;
  const firstVisit = firstVisitRows?.[0] ?? null;

  if (firstVisit) {
    registrationSessionId = registrationSessionId || firstVisit.session_id || null;
    registrationIp = registrationIp || firstVisit.ip || null;
    registrationCountry = firstVisit.country || null;
    registrationCity = firstVisit.city || null;
    // Visits store a missing source as "direct", so a direct first visit must
    // not mask a campaign the visitor arrived from later. Attribution fields
    // are taken together from one touch to avoid mixing campaigns.
    const firstVisitSource = normalizeUtmSource(firstVisit.utm_source);
    if (firstVisitSource !== "direct") {
      utmSource = firstVisitSource;
      utmMedium = firstVisit.utm_medium || null;
      utmCampaign = firstVisit.utm_campaign || null;
      utmContent = firstVisit.utm_content || null;
      utmTerm = firstVisit.utm_term || null;
    }

    const visitedAt = new Date(firstVisit.visited_at);
    if (!Number.isNaN(visitedAt.getTime())) {
      timeToRegisterSeconds = Math.max(
        0,
        Math.floor((Date.now() - visitedAt.getTime()) / 1000),
      );
    }
  }

  const registrationSourceCommunityId =
    sourceCommunityId || resolvedCommunity?.id || event.community_id;

  const { error: registerError } = await (supabase as any)
    .from("event_registrations")
    .insert({
      event_id: event.id,
      user_id: user.id,
      rsvp_status: "going",
      is_verified: true,
      approval_status: approvalStatus,
      custom_answers:
        customAnswers as import("~/shared/models/database.types").Json | undefined,
      registration_source_community_id: registrationSourceCommunityId,
      checkin_token: checkinToken,
      registration_session_id: registrationSessionId,
      registration_ip: registrationIp,
      registration_country: registrationCountry,
      registration_city: registrationCity,
      time_to_register_seconds: timeToRegisterSeconds,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
    });

  if (registerError) {
    const duplicateError = sanitizeDuplicateError(registerError, {
      email: user.email || undefined,
    });
    if (duplicateError) {
      return { success: false, error: duplicateError };
    }

    console.error("Error creating registration:", registerError);
    return {
      success: false,
      error: "Failed to create registration. Please try again.",
    };
  }

  if (isPaid) {
    const { data: createdRegistration } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!createdRegistration) {
      return {
        success: false,
        error: "Failed to create registration. Please try again.",
      };
    }

    const payment = await requestRegistrationPayment({
      event,
      registrationId: createdRegistration.id,
      registrationCount,
      eventReturnUrl: await getEventReturnUrl(request, supabase, event, community),
    });

    // Only on the first registration, so a retry never sends the emails twice.
    if (
      payment.success &&
      payment.provider === CommunitySettings.PaymentProvider.Manual
    ) {
      try {
        await sendPaymentRequestEmails(
          createdRegistration.id,
          publicOrigin(request),
        );
      } catch (error) {
        console.error("Failed to send payment request emails:", error);
      }
    }

    return payment;
  }

  if (joinCommunity && joinCommunityId) {
    try {
      await ensureCommunityMembership({
        supabase,
        userId: user.id,
        communityId: joinCommunityId,
        userEmail: user.email,
        skipNotification: joinCommunityId === event.community_id,
      });
    } catch (joinError) {
      console.error("Failed to join community after event registration:", joinError);
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const origin = publicOrigin(request);
  const eventDate = dayjs(event.start_time).tz(event.timezone);
  const eventLink = Routes.absolute(
    origin,
    Routes.community.event(
      resolvedCommunity?.slug ?? "unknown",
      publicEventSlug(event),
    ),
  );
  const recipientName =
    profile?.full_name ||
    submittedFullName ||
    user.email?.split("@")[0] ||
    "there";

  const registrationState: EventRegistrationState = {
    isUserRegistered: true,
    userRegistrationStatus: approvalStatus,
    userCheckinToken: checkinToken,
    registrationCount: await getApprovedRegistrationCount(
      serviceClient,
      event.id,
    ),
  };

  if (user.email) {
    try {
      await sendRegistrationAttendeeEmail({
        approvalStatus,
        recipientEmail: user.email,
        recipientName,
        eventTitle: event.title,
        communityName: resolvedCommunity?.name ?? "Community",
        eventDate: eventDate.format("dddd, MMMM D, YYYY"),
        eventTime: eventDate.format("h:mm A z"),
        eventLink,
        registerAccountLink: `${origin}/signup`,
        startTimeISO: event.start_time,
        endTimeISO: event.end_time || event.start_time,
        locationAddress: event.location_address || undefined,
        locationMapUrl: event.location_address
          ? GoogleMaps.mapsSearchUrl({
              name: event.location_name,
              address: event.location_address,
              placeId: event.location_place_id,
            })
          : undefined,
        onlineMeetingLink: event.online_meeting_link || undefined,
        checkinToken,
      });
    } catch (error) {
      console.error("Failed to send registration confirmation email:", error);
    }
  }

  try {
    const { data: collaborations } = await supabase
      .from("event_collaborations")
      .select("community_id, community:communities(name)")
      .eq("event_id", event.id)
      .eq("status", "accepted")
      .neq("role", "host");

    const coHostCommunityNames =
      collaborations
        ?.map((c: { community?: { name?: string } | { name?: string }[] }) => {
          const collabCommunity = c.community;
          if (Array.isArray(collabCommunity)) return collabCommunity[0]?.name;
          return collabCommunity?.name;
        })
        .filter(Boolean) as string[] || [];

    await sendRegistrationOrganizerNotifications({
      hostCommunityId: event.community_id,
      hostCommunityName: resolvedCommunity?.name ?? "Community",
      coHostCommunityNames,
      eventTitle: event.title,
      registrantName: recipientName,
      registrantEmail: user.email || "",
      eventDate: eventDate.format("dddd, MMMM D, YYYY"),
      eventTime: eventDate.format("h:mm A z"),
      eventLink,
    });
  } catch (notifyError) {
    console.error("Failed to send registration notification:", notifyError);
  }

  return {
    success: true,
    message: approvalStatus === "pending"
      ? "Registration request sent! Waiting for approval."
      : "Successfully registered for the event!",
    registrationState,
    registeredEventCommunityId: event.community_id,
  };
}
