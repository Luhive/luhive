import { createClient, createServiceRoleClient } from "~/shared/lib/supabase/server";
import type { ActionFunctionArgs } from "react-router";
import { Routes } from "~/shared/lib/routing/routes";
import {
  inviteCollaboration,
  acceptCollaboration,
  rejectCollaboration,
  removeCollaboration,
  getCollaborationById,
  isHostCommunity,
  getHostCommunity,
} from "~/modules/events/data/collaborations-repo.server";
import { sendCollaborationInviteEmail, sendCollaborationAcceptedEmail } from "~/shared/lib/email.server";
import { resolvePublicEvent } from "~/modules/events/server/resolve-public-event.server";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

export type CollaborationActionData = {
  success?: boolean;
  error?: string;
  collaboration?: unknown;
};

/**
 * Check if user is owner/admin of a community
 */
async function isCommunityOwnerOrAdmin(
  supabase: ReturnType<typeof createClient>["supabase"],
  communityId: string,
  userId: string
): Promise<boolean> {
  const { data: community } = await supabase
    .from("communities")
    .select("created_by")
    .eq("id", communityId)
    .single();

  if (community?.created_by === userId) {
    return true;
  }

  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .single();

  return membership?.role === "owner" || membership?.role === "admin";
}

export async function collaborationAction({
  request,
  params,
}: ActionFunctionArgs): Promise<CollaborationActionData | Response> {
  const { supabase } = createClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  const eventSlug = (params as { eventSlug?: string }).eventSlug;
  const slug = (params as { slug?: string }).slug;

  if (!eventSlug || !slug) {
    return { success: false, error: "Event slug required" };
  }

  const resolved = await resolvePublicEvent(supabase, slug, eventSlug, {
    publishedOnly: false,
  });

  if (!resolved) {
    return { success: false, error: "Event not found" };
  }

  const event = resolved.event;
  const eventId = event.id;

  // Get host community
  const { community: hostCommunity, error: hostError } = await getHostCommunity(
    supabase,
    eventId
  );

  if (hostError || !hostCommunity) {
    return { success: false, error: "Host community not found" };
  }

  if (intent === "invite-collaboration") {
    // Only host community owners/admins can invite
    const canInvite = await isHostCommunity(supabase, eventId, event.community_id);
    if (!canInvite) {
      // Check if user is owner/admin of host community
      const isOwner = await isCommunityOwnerOrAdmin(
        supabase,
        event.community_id,
        user.id
      );
      if (!isOwner) {
        return { success: false, error: "Only host community can invite collaborators" };
      }
    }

    const coHostCommunityId = formData.get("coHostCommunityId") as string;
    if (!coHostCommunityId) {
      return { success: false, error: "Co-host community ID required" };
    }

    // Prevent self-invitation
    if (coHostCommunityId === event.community_id) {
      return { success: false, error: "Cannot invite your own community" };
    }

    // Verify co-host community exists
    const { data: coHostCommunity, error: coHostError } = await supabase
      .from("communities")
      .select("id, name, slug, created_by")
      .eq("id", coHostCommunityId)
      .single();

    if (coHostError || !coHostCommunity) {
      return { success: false, error: "Co-host community not found" };
    }

    // Invite collaboration
    const { collaboration, error: inviteError } = await inviteCollaboration(
      supabase,
      eventId,
      coHostCommunityId,
      user.id
    );

    if (inviteError || !collaboration) {
      return {
        success: false,
        error: inviteError?.message || "Failed to invite collaboration",
      };
    }

    // Send invitation email to co-host community owner
    try {
      const serviceClient = createServiceRoleClient();
      const { data: ownerData } = await serviceClient.auth.admin.getUserById(
        coHostCommunity.created_by
      );

      if (ownerData?.user?.email) {
        const { data: hostCommunityData } = await supabase
          .from("communities")
          .select("name, slug")
          .eq("id", event.community_id)
          .single();

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const linkCommunitySlug = slug ?? hostCommunityData?.slug;
        if (!linkCommunitySlug) {
          throw new Response("Community slug required", { status: 400 });
        }

        const inviteLink = Routes.absolute(publicOrigin(request), Routes.community.collaborationInvite(coHostCommunity.slug, collaboration.id));
        const eventLink = Routes.absolute(publicOrigin(request), Routes.community.event(linkCommunitySlug, publicEventSlug(event)));

        await sendCollaborationInviteEmail({
          eventTitle: event.title,
          hostCommunityName: hostCommunityData?.name || "Unknown Community",
          coHostCommunityName: coHostCommunity.name,
          recipientEmail: ownerData.user.email,
          inviteLink,
          eventLink,
          invitedByName: userProfile?.full_name || user.email?.split("@")[0] || "Someone",
        });
      }
    } catch (emailError) {
      console.error("Failed to send collaboration invite email:", emailError);
      // Don't fail the request if email fails
    }

    return { success: true, collaboration };
  }

  if (intent === "accept-collaboration") {
    const collaborationId = formData.get("collaborationId") as string;
    if (!collaborationId) {
      return { success: false, error: "Collaboration ID required" };
    }

    // Get collaboration
    const { collaboration, error: collabError } = await getCollaborationById(
      supabase,
      collaborationId
    );

    if (collabError || !collaboration) {
      return { success: false, error: "Collaboration not found" };
    }

    // Verify user is owner/admin of co-host community
    const isOwner = await isCommunityOwnerOrAdmin(
      supabase,
      collaboration.community_id,
      user.id
    );

    if (!isOwner) {
      return {
        success: false,
        error: "Only community owners can accept collaborations",
      };
    }

    // Accept collaboration
    const { collaboration: acceptedCollab, error: acceptError } =
      await acceptCollaboration(supabase, collaborationId);

    if (acceptError || !acceptedCollab) {
      return {
        success: false,
        error: acceptError?.message || "Failed to accept collaboration",
      };
    }

    // Send acceptance email to host community owner
    try {
      const serviceClient = createServiceRoleClient();
      const eventData = collaboration.event as {
        id: string;
        slug: string | null;
        title: string;
        community_id: string;
        created_by: string;
      };
      const { data: hostCommunityData } = await supabase
        .from("communities")
        .select("name, slug, created_by")
        .eq("id", eventData.community_id)
        .single();

      if (hostCommunityData?.created_by) {
        const { data: ownerData } = await serviceClient.auth.admin.getUserById(
          hostCommunityData.created_by
        );

        if (ownerData?.user?.email) {
          const communityData = collaboration.community as { name: string; slug: string };
          const eventLink = Routes.absolute(
            publicOrigin(request),
            Routes.community.event(hostCommunityData.slug, publicEventSlug(eventData)),
          );

          await sendCollaborationAcceptedEmail({
            eventTitle: eventData.title,
            hostCommunityName: hostCommunityData.name,
            coHostCommunityName: communityData.name,
            recipientEmail: ownerData.user.email,
            eventLink,
          });
        }
      }
    } catch (emailError) {
      console.error("Failed to send collaboration accepted email:", emailError);
      // Don't fail the request if email fails
    }

    // Notify community members based on whether this is a new or existing event
    // Check if this is a new event by comparing event created_at with collaboration invited_at
    const collaborationCreatedAt = collaboration.created_at
      ? new Date(collaboration.created_at)
      : null;
    const eventCreatedAt = event.created_at ? new Date(event.created_at) : null;
    
    // If event was created around the same time as collaboration (within 5 minutes), it's a new event
    // Otherwise, it's an existing event
    let isNewEvent = false;
    if (eventCreatedAt && collaborationCreatedAt) {
      const timeDiff = Math.abs(collaborationCreatedAt.getTime() - eventCreatedAt.getTime());
      isNewEvent = timeDiff < 5 * 60 * 1000; // 5 minutes in milliseconds
    }

    // Get the co-host community info
    const communityData = collaboration.community as { id: string; name: string };
    
    // Format event date/time
    const eventDateTime = event.start_time 
      ? new Date(event.start_time) 
      : null;
    const eventDate = eventDateTime 
      ? eventDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'TBD';
    const eventTime = eventDateTime 
      ? eventDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
      : 'TBD';

    const eventLink = Routes.absolute(publicOrigin(request), Routes.community.event(slug, publicEventSlug(event)));

    // Trigger community member notifications
    console.log("=== Collaboration Notification Debug ===");
    console.log("isNewEvent:", isNewEvent);
    console.log("event.created_at:", event.created_at);
    console.log("collaboration.created_at:", collaboration.created_at);
    console.log("event.community_id:", event.community_id);
    console.log("hostCommunity.name:", hostCommunity.name);
    console.log("coHostCommunityId:", collaboration.community_id);
    
    const notificationType = isNewEvent ? 'collaboration-accepted-new-event' : 'collaboration-accepted-existing-event';
    console.log("notificationType:", notificationType);
    
    try {
      const response = await fetch(`${publicOrigin(request)}/api/events/collaboration-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: notificationType,
          eventId,
          hostCommunityId: event.community_id,
          hostCommunityName: hostCommunity.name,
          coHostCommunityId: collaboration.community_id,
          eventTitle: event.title,
          eventDate,
          eventTime,
          eventLink,
          locationAddress: event.location_address || undefined,
          onlineMeetingLink: event.online_meeting_link || undefined,
        }),
      });
      
      const responseText = await response.text();
      console.log("Notification API response status:", response.status);
      console.log("Notification API response:", responseText);
    } catch (notifyError) {
      console.error("Failed to trigger community notifications:", notifyError);
      // Don't fail the request if notification fails
    }

    return { success: true, collaboration: acceptedCollab };
  }

  if (intent === "reject-collaboration") {
    const collaborationId = formData.get("collaborationId") as string;
    if (!collaborationId) {
      return { success: false, error: "Collaboration ID required" };
    }

    // Get collaboration
    const { collaboration, error: collabError } = await getCollaborationById(
      supabase,
      collaborationId
    );

    if (collabError || !collaboration) {
      return { success: false, error: "Collaboration not found" };
    }

    // Verify user is owner/admin of co-host community
    const isOwner = await isCommunityOwnerOrAdmin(
      supabase,
      collaboration.community_id,
      user.id
    );

    if (!isOwner) {
      return {
        success: false,
        error: "Only community owners can reject collaborations",
      };
    }

    // Reject collaboration
    const { collaboration: rejectedCollab, error: rejectError } =
      await rejectCollaboration(supabase, collaborationId);

    if (rejectError || !rejectedCollab) {
      return {
        success: false,
        error: rejectError?.message || "Failed to reject collaboration",
      };
    }

    return { success: true, collaboration: rejectedCollab };
  }

  if (intent === "remove-collaboration") {
    const collaborationId = formData.get("collaborationId") as string;
    if (!collaborationId) {
      return { success: false, error: "Collaboration ID required" };
    }

    // Only host community can remove
    const canInvite = await isHostCommunity(supabase, eventId, event.community_id);
    if (!canInvite) {
      const isOwner = await isCommunityOwnerOrAdmin(
        supabase,
        event.community_id,
        user.id
      );
      if (!isOwner) {
        return {
          success: false,
          error: "Only host community can remove collaborations",
        };
      }
    }

    // Remove collaboration
    const { error: removeError } = await removeCollaboration(
      supabase,
      collaborationId
    );

    if (removeError) {
      return {
        success: false,
        error: removeError.message || "Failed to remove collaboration",
      };
    }

    return { success: true };
  }

  return { success: false, error: "Invalid intent" };
}
