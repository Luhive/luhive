import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { createClient } from "~/shared/lib/supabase/server";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import {
  getCollaborationById,
  acceptCollaboration,
  rejectCollaboration,
} from "~/modules/events/data/collaborations-repo.server";
import type { CollaborationInviteEventPreview } from "~/modules/events/model/collaboration-invite.types";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const { supabase } = createClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const collaborationId = (params as { collaborationId?: string }).collaborationId;
  const slug = (params as { slug?: string }).slug;

  if (!collaborationId) {
    return { success: false, error: "Collaboration ID required" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  const { collaboration, error: collabError } = await getCollaborationById(supabase, collaborationId);

  if (collabError || !collaboration) {
    return { success: false, error: "Collaboration not found" };
  }

  const communityData = Array.isArray(collaboration.community)
    ? collaboration.community[0]
    : collaboration.community;

  if (!communityData || communityData.slug !== slug) {
    return { success: false, error: "Invalid collaboration" };
  }

  if (intent === "accept") {
    const { collaboration: acceptedCollab, error: acceptError } = await acceptCollaboration(
      supabase,
      collaborationId,
    );

    if (acceptError || !acceptedCollab) {
      return {
        success: false,
        error: acceptError?.message || "Failed to accept collaboration",
      };
    }

    const rawEvent = Array.isArray(collaboration.event)
      ? collaboration.event[0]
      : collaboration.event;

    if (!rawEvent) {
      return { success: false, error: "Event not found" };
    }

    const eventData = rawEvent as CollaborationInviteEventPreview;

    const coHostCommunityData = Array.isArray(collaboration.community)
      ? collaboration.community[0]
      : collaboration.community;

    const { data: hostCommunity } = await supabase
      .from("communities")
      .select("id, name, slug, created_by")
      .eq("id", eventData.community_id)
      .single();

    if (!hostCommunity) {
      return { success: false, error: "Host community not found" };
    }

    const collaborationCreatedAt = collaboration.created_at
      ? new Date(collaboration.created_at)
      : null;
    const eventCreatedAt = eventData.created_at ? new Date(eventData.created_at) : null;

    let isNewEvent = false;
    if (eventCreatedAt && collaborationCreatedAt) {
      const timeDiff = Math.abs(collaborationCreatedAt.getTime() - eventCreatedAt.getTime());
      isNewEvent = timeDiff < 5 * 60 * 1000;
    }

    const eventDateTime = eventData.start_time ? new Date(eventData.start_time) : null;
    const eventDate = eventDateTime
      ? eventDateTime.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "TBD";
    const eventTime = eventDateTime
      ? eventDateTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      : "TBD";

    const eventLink = Routes.absolute(publicOrigin(request), Routes.community.event(hostCommunity.slug, publicEventSlug(eventData)));

    console.log("=== Collaboration Notification Debug ===");
    console.log("isNewEvent:", isNewEvent);
    console.log("event.created_at:", eventData.created_at);
    console.log("collaboration.created_at:", collaboration.created_at);
    console.log("hostCommunity.id:", hostCommunity.id);
    console.log("hostCommunity.name:", hostCommunity.name);
    console.log("coHostCommunityId:", coHostCommunityData?.id);

    const notificationType = isNewEvent
      ? "collaboration-accepted-new-event"
      : "collaboration-accepted-existing-event";
    console.log("notificationType:", notificationType);

    try {
      const response = await fetch(
        `${publicOrigin(request)}/api/events/collaboration-notification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: notificationType,
            eventId: eventData.id,
            hostCommunityId: hostCommunity.id,
            hostCommunityName: hostCommunity.name,
            coHostCommunityId: coHostCommunityData?.id,
            eventTitle: eventData.title,
            eventDate,
            eventTime,
            eventLink,
            locationAddress: eventData.location_address || undefined,
            onlineMeetingLink: eventData.online_meeting_link || undefined,
          }),
        },
      );

      const responseText = await response.text();
      console.log("Notification API response status:", response.status);
      console.log("Notification API response:", responseText);
    } catch (notifyError) {
      console.error("Failed to trigger community notifications:", notifyError);
    }

    return redirect(Routes.community.event(hostCommunity.slug, publicEventSlug(eventData)));
  }

  if (intent === "reject") {
    const { collaboration: rejectedCollab, error: rejectError } = await rejectCollaboration(
      supabase,
      collaborationId,
    );

    if (rejectError || !rejectedCollab) {
      return {
        success: false,
        error: rejectError?.message || "Failed to reject collaboration",
      };
    }

    return redirect(Routes.community.detail(slug ?? communityData.slug));
  }

  return { success: false, error: "Invalid intent" };
}
