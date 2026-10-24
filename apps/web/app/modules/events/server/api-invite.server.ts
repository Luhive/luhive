import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { ActionFunctionArgs } from "react-router";
import { createClient, createServiceRoleClient } from "~/shared/lib/supabase/server";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { sendEventInviteEmail } from "~/shared/lib/email.server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";
import {
  canUserInviteToEvent,
  createInvite,
  getInviteTokenExpiresAt,
  getPendingInviteByEmail,
  hasVerifiedRegistrationForEmail,
  hasVerifiedRegistrationForUser,
  refreshInviteToken,
} from "~/modules/events/data/invites-repo.server";

dayjs.extend(utc);
dayjs.extend(timezone);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { supabase } = createClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { success: false, error: "Please log in to send invitations." },
      { status: 401 },
    );
  }

  let body: { eventId?: string; inviteeName?: string; inviteeEmail?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const eventId = (body.eventId || "").trim();
  const inviteeName = (body.inviteeName || "").trim();
  const inviteeEmail = (body.inviteeEmail || "").trim().toLowerCase();

  if (!eventId) {
    return Response.json(
      { success: false, error: "Event is required." },
      { status: 400 },
    );
  }

  if (!inviteeName) {
    return Response.json(
      { success: false, error: "Name is required." },
      { status: 400 },
    );
  }

  if (!inviteeEmail || !EMAIL_REGEX.test(inviteeEmail)) {
    return Response.json(
      { success: false, error: "A valid email is required." },
      { status: 400 },
    );
  }

  const serviceClient = createServiceRoleClient();

  const { data: event, error: eventError } = await serviceClient
    .from("events")
    .select("id, title, community_id, start_time, timezone, registration_type, slug")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return Response.json(
      { success: false, error: "Event not found." },
      { status: 404 },
    );
  }

  if (event.registration_type === "external") {
    return Response.json(
      { success: false, error: "This event does not support invites on Luhive." },
      { status: 400 },
    );
  }

  const { data: community, error: communityError } = await serviceClient
    .from("communities")
    .select("id, name, slug")
    .eq("id", event.community_id)
    .single();

  if (communityError || !community) {
    return Response.json(
      { success: false, error: "Community not found." },
      { status: 404 },
    );
  }

  const canInvite = await canUserInviteToEvent(
    serviceClient,
    event.id,
    community.id,
    user.id,
  );

  if (!canInvite) {
    return Response.json(
      { success: false, error: "You are not allowed to invite people to this event." },
      { status: 403 },
    );
  }

  if (await hasVerifiedRegistrationForEmail(serviceClient, event.id, inviteeEmail)) {
    return Response.json(
      { success: false, error: "This person is already registered for this event." },
      { status: 400 },
    );
  }

  const { data: existingAuthLink } = await serviceClient.auth.admin.generateLink({
    type: "magiclink",
    email: inviteeEmail,
  });

  if (
    existingAuthLink?.user?.id &&
    (await hasVerifiedRegistrationForUser(
      serviceClient,
      event.id,
      existingAuthLink.user.id,
    ))
  ) {
    return Response.json(
      { success: false, error: "This person is already registered for this event." },
      { status: 400 },
    );
  }

  const verificationToken = crypto.randomUUID();
  const tokenExpiresAt = getInviteTokenExpiresAt();

  const { data: pendingInvite } = await getPendingInviteByEmail(
    serviceClient,
    event.id,
    inviteeEmail,
  );

  let registrationId: string;

  if (pendingInvite) {
    const { error: refreshError } = await refreshInviteToken(
      serviceClient,
      pendingInvite.id,
      verificationToken,
      tokenExpiresAt,
      inviteeName,
    );

    if (refreshError) {
      return Response.json(
        { success: false, error: refreshError.message },
        { status: 500 },
      );
    }

    registrationId = pendingInvite.id;
  } else {
    const { data: createdInvite, error: createError } = await createInvite(
      serviceClient,
      {
        eventId: event.id,
        inviteeName,
        inviteeEmail,
        invitedByUserId: user.id,
        verificationToken,
        tokenExpiresAt,
        registrationSourceCommunityId: community.id,
      },
    );

    if (createError || !createdInvite) {
      return Response.json(
        { success: false, error: createError?.message ?? "Failed to create invitation." },
        { status: 500 },
      );
    }

    registrationId = createdInvite.id;
  }

  const { data: inviterProfile } = await serviceClient
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const origin = publicOrigin(request);
  const acceptLink = Routes.absolute(
    origin,
    `${Routes.community.eventInviteAccept(community.slug, publicEventSlug(event))}?token=${verificationToken}`,
  );
  const eventLink = Routes.absolute(
    origin,
    Routes.community.event(community.slug, publicEventSlug(event)),
  );

  const tz = event.timezone ?? "UTC";
  const eventDate = dayjs(event.start_time).tz(tz);

  try {
    await sendEventInviteEmail({
      eventTitle: event.title,
      communityName: community.name,
      recipientEmail: inviteeEmail,
      recipientName: inviteeName,
      inviteLink: acceptLink,
      eventLink,
      invitedByName: inviterProfile?.full_name || "Someone from the community",
      eventDate: eventDate.format("dddd, MMMM D, YYYY"),
      eventTime: eventDate.format("h:mm A z"),
    });
  } catch (emailError) {
    console.error("Failed to send event invite email:", emailError);
    return Response.json(
      { success: false, error: "Failed to send invitation email." },
      { status: 500 },
    );
  }

  return Response.json({
    success: true,
    message: pendingInvite
      ? "Invitation resent successfully."
      : "Invitation sent successfully.",
    invite: {
      registrationId,
      inviteeName,
      inviteeEmail,
      invitedByUserId: user.id,
      invitedByName: inviterProfile?.full_name ?? null,
      isResend: Boolean(pendingInvite),
    },
  });
}
