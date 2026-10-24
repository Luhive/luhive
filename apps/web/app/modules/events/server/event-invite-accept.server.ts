import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { Json } from "~/shared/models/database.types";
import {
  createClient,
  createServiceRoleClient,
} from "~/shared/lib/supabase/server";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import {
  finalizeInvite,
  getInviteByToken,
  isInviteTokenExpired,
  isInviterOrganizer,
} from "~/modules/events/data/invites-repo.server";
import { getApprovedRegistrationCount } from "~/modules/events/data/registrations-repo.server";
import { ensureCommunityMembership } from "~/modules/community/server/join-community.server";
import type { PendingEventInvite } from "~/modules/events/model/invite.types";
import type { CustomAnswerJson } from "~/modules/events/model/event.types";
import { sendRegistrationAttendeeEmail } from "~/modules/events/server/send-registration-attendee-email.server";
import { sendRegistrationOrganizerNotifications } from "~/modules/events/server/send-registration-notification.server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface InviteEventContext {
  id: string;
  title: string;
  community_id: string;
  start_time: string;
  end_time: string | null;
  timezone: string | null;
  custom_questions: unknown;
  is_approve_required: boolean | null;
  location_address: string | null;
  online_meeting_link: string | null;
  slug: string | null;
}

export async function loadInviteWithEvent(
  token: string,
  eventId?: string,
) {
  const serviceClient = createServiceRoleClient();
  const { data: invite, error } = await getInviteByToken(serviceClient, token);
  if (error || !invite) {
    return { invite: null, event: null, error: "Invalid or expired invitation." };
  }

  if (eventId && invite.event_id !== eventId) {
    return { invite: null, event: null, error: "Invitation does not match this event." };
  }

  if (isInviteTokenExpired(invite.token_expires_at)) {
    return { invite: null, event: null, error: "This invitation has expired." };
  }

  const { data: event, error: eventError } = await serviceClient
    .from("events")
    .select(
      "id, title, community_id, start_time, end_time, timezone, custom_questions, is_approve_required, location_address, online_meeting_link, slug",
    )
    .eq("id", invite.event_id)
    .single();

  if (eventError || !event) {
    return { invite: null, event: null, error: "Event not found." };
  }

  return { invite, event: event as InviteEventContext, error: null };
}

export async function resolveInviteApprovalStatus(
  invite: PendingEventInvite,
  event: Pick<InviteEventContext, "community_id" | "is_approve_required">,
): Promise<"pending" | "approved"> {
  const serviceClient = createServiceRoleClient();
  const inviterIsOrganizer = await isInviterOrganizer(
    serviceClient,
    event.community_id,
    invite.invited_by_user_id,
  );

  if (inviterIsOrganizer) {
    return "approved";
  }

  return event.is_approve_required ? "pending" : "approved";
}

export async function ensureVerifiedAccountForInvite(
  inviteEmail: string,
  inviteName: string,
) {
  const serviceClient = createServiceRoleClient();
  const normalizedEmail = inviteEmail.toLowerCase().trim();

  const { error: createError } = await serviceClient.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: {
      full_name: inviteName.trim(),
    },
  });

  if (
    createError &&
    !createError.message.toLowerCase().includes("already") &&
    !createError.message.toLowerCase().includes("registered")
  ) {
    throw new Error(createError.message);
  }

  const { data: linkData, error: linkError } =
    await serviceClient.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });

  if (linkError || !linkData.user) {
    throw new Error(linkError?.message || "Failed to create sign-in link.");
  }

  const { data: existingProfile } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("id", linkData.user.id)
    .maybeSingle();

  if (!existingProfile) {
    await serviceClient.from("profiles").insert({
      id: linkData.user.id,
      full_name: inviteName.trim(),
    });
  }

  return {
    userId: linkData.user.id,
    email: normalizedEmail,
    tokenHash: linkData.properties.hashed_token,
  };
}

export async function establishSessionFromInviteToken(
  request: Request,
  tokenHash: string,
) {
  const { supabase, headers } = createClient(request);

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) {
    throw new Error(error.message);
  }

  return { supabase, headers };
}

export async function completeInviteRegistration({
  request,
  invite,
  event,
  userId,
  userEmail,
  customAnswers,
  joinCommunity = false,
}: {
  request: Request;
  invite: PendingEventInvite;
  event: InviteEventContext;
  userId: string;
  userEmail: string;
  customAnswers?: CustomAnswerJson | null;
  joinCommunity?: boolean;
}) {
  if (userEmail.toLowerCase() !== (invite.anonymous_email || "").toLowerCase()) {
    return { success: false as const, error: "This invitation belongs to a different email." };
  }

  const serviceClient = createServiceRoleClient();
  const approvalStatus = await resolveInviteApprovalStatus(invite, event);
  const checkinToken = approvalStatus === "approved" ? crypto.randomUUID() : null;

  const { data: finalized, error: finalizeError } = await finalizeInvite(serviceClient, {
    verificationToken: invite.verification_token!,
    userId,
    approvalStatus,
    checkinToken,
    customAnswers: (customAnswers as Json | undefined) ?? null,
  });

  if (finalizeError || !finalized) {
    return {
      success: false as const,
      error: finalizeError?.message || "Failed to complete registration.",
    };
  }

  await sendInviteRegistrationEmails({
    request,
    event,
    userEmail,
    inviteName: invite.anonymous_name || userEmail.split("@")[0] || "Guest",
    approvalStatus,
    checkinToken,
  });

  if (joinCommunity) {
    try {
      await ensureCommunityMembership({
        supabase: serviceClient,
        userId,
        communityId: event.community_id,
        userEmail,
        memberName: invite.anonymous_name,
        skipNotification: true,
      });
    } catch (joinError) {
      console.error("Failed to join community after invite acceptance:", joinError);
    }
  }

  return {
    success: true as const,
    approvalStatus,
    message:
      approvalStatus === "pending"
        ? "Registration request sent! Waiting for approval."
        : "Successfully registered for the event!",
    registrationState: {
      isUserRegistered: true,
      userRegistrationStatus: approvalStatus,
      userCheckinToken: checkinToken,
      registrationCount: await getApprovedRegistrationCount(
        serviceClient,
        event.id,
      ),
    },
  };
}

async function sendInviteRegistrationEmails({
  request,
  event,
  userEmail,
  inviteName,
  approvalStatus,
  checkinToken,
}: {
  request: Request;
  event: InviteEventContext;
  userEmail: string;
  inviteName: string;
  approvalStatus: "pending" | "approved";
  checkinToken: string | null;
}) {
  const serviceClient = createServiceRoleClient();
  const { data: hostCommunity } = await serviceClient
    .from("communities")
    .select("name, slug")
    .eq("id", event.community_id)
    .single();

  const tz = event.timezone ?? "UTC";
  const eventDate = dayjs(event.start_time).tz(tz);
  const origin = publicOrigin(request);
  const eventLink = Routes.absolute(
    origin,
    Routes.community.event(hostCommunity?.slug ?? "unknown", publicEventSlug(event)),
  );

  try {
    await sendRegistrationAttendeeEmail({
      approvalStatus,
      recipientEmail: userEmail,
      recipientName: inviteName,
      eventTitle: event.title ?? "Event",
      communityName: hostCommunity?.name ?? "Community",
      eventDate: eventDate.format("dddd, MMMM D, YYYY"),
      eventTime: eventDate.format("h:mm A z"),
      eventLink,
      registerAccountLink: `${origin}/signup`,
      startTimeISO: event.start_time,
      endTimeISO: event.end_time ?? event.start_time,
      locationAddress: event.location_address ?? undefined,
      onlineMeetingLink: event.online_meeting_link ?? undefined,
      checkinToken,
    });
  } catch (emailError) {
    console.error("Failed to send invite registration confirmation email:", emailError);
  }

  try {
    const { data: collaborations } = await serviceClient
      .from("event_collaborations")
      .select("community_id, community:communities(name)")
      .eq("event_id", event.id)
      .eq("status", "accepted")
      .neq("role", "host");

    const coHostCommunityNames =
      collaborations
        ?.map((c: { community?: { name?: string } | { name?: string }[] }) =>
          Array.isArray((c as { community?: { name?: string }[] }).community)
            ? (c as { community?: { name?: string }[] }).community?.[0]?.name
            : (c as { community?: { name?: string } }).community?.name,
        )
        .filter(Boolean) as string[] ?? [];

    await sendRegistrationOrganizerNotifications({
      hostCommunityId: event.community_id,
      hostCommunityName: hostCommunity?.name ?? "Community",
      coHostCommunityNames,
      eventTitle: event.title,
      registrantName: inviteName,
      registrantEmail: userEmail,
      eventDate: eventDate.format("dddd, MMMM D, YYYY"),
      eventTime: eventDate.format("h:mm A z"),
      eventLink,
    });
  } catch (notifyError) {
    console.error("Failed to send invite registration notification:", notifyError);
  }
}

export function eventHasCustomQuestions(customQuestions: unknown): boolean {
  const cq = customQuestions as {
    phone?: { enabled?: boolean };
    custom?: unknown[];
  } | null;

  return Boolean(cq && (cq.phone?.enabled || (cq.custom?.length ?? 0) > 0));
}
