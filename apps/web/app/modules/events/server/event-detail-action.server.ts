import {
  createClient,
  createServiceRoleClient,
} from "~/shared/lib/supabase/server";
import { redirect, type ActionFunctionArgs } from "react-router";
import { getIpLocation } from "~/shared/lib/ip-location.server";
import { getUserAgent } from "~/modules/community/utils/user-agent";
import { normalizeUtmSource } from "~/modules/events/utils/utm-source";
import { resolvePublicEvent } from "~/modules/events/server/resolve-public-event.server";
import { handleAcceptInviteAction } from "~/modules/events/server/event-invite-accept-action.server";
import { getApprovedRegistrationCount } from "~/modules/events/data/registrations-repo.server";
import { computeCanRegister } from "~/modules/events/server/fetch-event-page-user-state.server";
import { completeEventRegistration } from "~/modules/events/server/complete-event-registration.server";
import type { EventRegistrationState } from "~/modules/events/model/event-detail-view.types";
import { releaseTicketOrderForCancellation } from "~/modules/events/server/release-ticket-order-for-cancellation.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const { supabase } = createClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "track_visit") {
    try {
      const eventId = (formData.get("eventId") as string | null)?.trim() || "";
      const communityId =
        (formData.get("communityId") as string | null)?.trim() || "";
      const sessionId = (formData.get("sessionId") as string | null)?.trim() || "";
      const clientIp = (formData.get("clientIp") as string | null)?.trim() || null;
      const clientCountry =
        (formData.get("clientCountry") as string | null)?.trim() || null;
      const clientCity = (formData.get("clientCity") as string | null)?.trim() || null;
      const clientRegion =
        (formData.get("clientRegion") as string | null)?.trim() || null;
      const clientTimezone =
        (formData.get("clientTimezone") as string | null)?.trim() || null;

      if (!eventId || !communityId || !sessionId) {
        return { success: false, error: "Missing tracking fields" };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const location = await getIpLocation(request, clientIp);
      const mergedLocation = {
        ...location,
        country: clientCountry || location.country,
        city: clientCity || location.city,
        region: clientRegion || location.region,
        timezone: clientTimezone || location.timezone,
      };
      const ua = getUserAgent(request);

      console.log("[event_visits] client", {
        ipOverride: clientIp,
        geoOverride: {
          country: clientCountry,
          city: clientCity,
          region: clientRegion,
          timezone: clientTimezone,
        },
        ip: location.ip,
        country: mergedLocation.country,
        city: mergedLocation.city,
        region: mergedLocation.region,
        timezone: mergedLocation.timezone,
      });

      const { error: visitInsertError } = await (supabase as any).from("event_visits").insert({
        event_id: eventId,
        community_id: communityId,
        session_id: sessionId,
        user_id: user?.id || null,
        utm_source: normalizeUtmSource(formData.get("utmSource") as string | null),
        utm_medium: (formData.get("utmMedium") as string | null) || null,
        utm_campaign: (formData.get("utmCampaign") as string | null) || null,
        utm_content: (formData.get("utmContent") as string | null) || null,
        utm_term: (formData.get("utmTerm") as string | null) || null,
        referrer_url: (formData.get("referrerUrl") as string | null) || null,
        referrer_domain: (formData.get("referrerDomain") as string | null) || null,
        ip: location.ip,
        country: mergedLocation.country,
        city: mergedLocation.city,
        region: mergedLocation.region,
        timezone: mergedLocation.timezone,
        device_type: ua.device.type || null,
        browser: ua.browser.name || null,
        os: ua.os.name || null,
        is_mobile: ua.device.isMobile || false,
      });

      if (visitInsertError) {
        console.error("Failed to insert event visit:", visitInsertError);
        return { success: false, error: "Failed to track visit" };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to track event visit:", error);
      return { success: false };
    }
  }

  const communitySlug = (params as { slug?: string }).slug;
  const eventSlug = (params as { eventSlug?: string }).eventSlug;
  if (!eventSlug || !communitySlug) {
    return { success: false, error: "Event slug and community slug required" };
  }

  const resolved = await resolvePublicEvent(supabase, communitySlug, eventSlug, {
    publishedOnly: false,
  });

  if (!resolved) {
    return { success: false, error: "Event not found" };
  }

  const { event, community } = resolved;
  const eventId = event.id;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (intent === "accept-invite") {
    if (authError || !user || !user.email) {
      return { success: false, error: "Please log in to accept this invitation." };
    }

    return handleAcceptInviteAction({
      request,
      params,
      formData,
      userId: user.id,
      userEmail: user.email,
    });
  }

  if (authError || !user) {
    return {
      success: false,
      error: "Please login to register for this event",
    };
  }

  if (intent === "register") {
    let customAnswers = null;
    const customAnswersStr = formData.get("custom_answers") as string;
    if (customAnswersStr) {
      try {
        customAnswers = JSON.parse(customAnswersStr);
      } catch (e) {
        console.error("Error parsing custom_answers:", e);
      }
    }

    const joinCommunity = formData.get("joinCommunity") !== "false";
    const registrationResult = await completeEventRegistration({
      request,
      supabase,
      user,
      event,
      community,
      sourceCommunityId: community.id,
      joinCommunityId: community.id,
      joinCommunity,
      customAnswers,
      tracking: {
        sessionId: (formData.get("eventSessionId") as string | null) || null,
        utmSource: formData.get("eventUtmSource") as string | null,
        utmMedium: formData.get("eventUtmMedium") as string | null,
        utmCampaign: formData.get("eventUtmCampaign") as string | null,
        utmContent: formData.get("eventUtmContent") as string | null,
        utmTerm: formData.get("eventUtmTerm") as string | null,
        firstVisitStartedAt:
          (formData.get("eventFirstVisitStartedAt") as string | null) || null,
      },
      duplicateMode: "error",
    });

    if (registrationResult.paymentUrl) {
      return redirect(registrationResult.paymentUrl);
    }

    return registrationResult;
  }

  if (intent === "unregister") {
    if (event.registration_type === "external") {
      return { success: false, error: "This event does not support registration on Luhive" };
    }

    const { data: ownRegistration } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownRegistration) {
      const released = await releaseTicketOrderForCancellation({
        registrationId: ownRegistration.id,
        eventId,
      });
      if (!released.ok) {
        const { data: owner } = community.created_by
          ? await createServiceRoleClient().auth.admin.getUserById(community.created_by)
          : { data: null };
        const ownerEmail = owner?.user?.email;
        const subject = encodeURIComponent(`Cancel my ticket: ${event.title}`);
        return {
          success: false,
          error: released.error,
          contactUrl: ownerEmail ? `mailto:${ownerEmail}?subject=${subject}` : undefined,
        };
      }
    }

    const { error: unregisterError } = await supabase
      .from("event_registrations")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (unregisterError) {
      return { success: false, error: unregisterError.message };
    }

    const registrationCount = await getApprovedRegistrationCount(
      createServiceRoleClient(),
      eventId,
    );

    const registrationState: EventRegistrationState & { canRegister: boolean } = {
      isUserRegistered: false,
      userRegistrationStatus: null,
      userCheckinToken: null,
      registrationCount,
      canRegister: computeCanRegister(event, registrationCount, false),
    };

    return { success: true, message: "Registration cancelled", registrationState };
  }

  return { success: false, error: "Invalid action" };
}
