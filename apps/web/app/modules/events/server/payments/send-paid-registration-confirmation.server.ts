import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { formatMoney } from "@luhive/domain/v1/money";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { GoogleMaps } from "~/modules/events/utils/google-maps";
import { sendRegistrationConfirmationEmail } from "~/shared/lib/email.server";
import { sendRegistrationOrganizerNotifications } from "~/modules/events/server/send-registration-notification.server";
import { ensureCommunityMembership } from "~/modules/community/server/join-community.server";
import { getApprovedRegistrationCount } from "~/modules/events/data/registrations-repo.server";

dayjs.extend(utc);
dayjs.extend(timezone);

export type PaidRegistrationConfirmationResult =
  | { sent: true }
  | { sent: false; reason: "not_ready" | "already_sent" | "no_email" };

/**
 * Sends the attendee confirmation and the organiser notification for a paid
 * registration, once. Safe to call again: a second call does nothing.
 */
export async function sendPaidRegistrationConfirmation(
  registrationId: string,
  origin: string,
  options?: { resend?: boolean },
): Promise<PaidRegistrationConfirmationResult> {
  const db = createServiceRoleClient();

  const { data: registration } = await db
    .from("event_registrations")
    .select("id, event_id, user_id, approval_status, checkin_token")
    .eq("id", registrationId)
    .maybeSingle();

  if (!registration || registration.approval_status !== "approved" || !registration.user_id) {
    return { sent: false, reason: "not_ready" };
  }

  const { data: order } = await db
    .from("ticket_orders")
    .select("status, amount_minor, currency, paid_via, confirmation_email_sent_at")
    .eq("registration_id", registrationId)
    .maybeSingle();

  if (!order || order.status !== "paid") {
    return { sent: false, reason: "not_ready" };
  }
  if (!options?.resend && order.confirmation_email_sent_at) {
    return { sent: false, reason: "already_sent" };
  }

  const [{ data: event }, { data: authUser }] = await Promise.all([
    db
      .from("events")
      .select(
        "id, title, slug, community_id, start_time, end_time, timezone, location_address, location_name, location_place_id, online_meeting_link",
      )
      .eq("id", registration.event_id)
      .maybeSingle(),
    db.auth.admin.getUserById(registration.user_id),
  ]);

  const recipientEmail = authUser.user?.email;
  if (!event || !recipientEmail) {
    return { sent: false, reason: "no_email" };
  }

  const [{ data: community }, { data: profile }, { data: collaborations }] =
    await Promise.all([
      db
        .from("communities")
        .select("id, name, slug")
        .eq("id", event.community_id)
        .maybeSingle(),
      db
        .from("profiles")
        .select("full_name")
        .eq("id", registration.user_id)
        .maybeSingle(),
      db
        .from("event_collaborations")
        .select("community:communities(name)")
        .eq("event_id", event.id)
        .eq("status", "accepted")
        .neq("role", "host"),
    ]);

  const communityName = community?.name ?? "Community";
  const recipientName =
    profile?.full_name || recipientEmail.split("@")[0] || "there";
  const eventDate = dayjs(event.start_time).tz(event.timezone);
  const eventLink = Routes.absolute(
    origin,
    Routes.community.event(community?.slug ?? "unknown", publicEventSlug(event)),
  );
  const ticketPrice = formatMoney(order.amount_minor, order.currency);
  const isPaidManually = order.paid_via === "manual";

  await sendRegistrationConfirmationEmail({
    eventTitle: event.title,
    communityName,
    eventDate: eventDate.format("dddd, MMMM D, YYYY"),
    eventTime: eventDate.format("h:mm A z"),
    eventLink,
    recipientName,
    recipientEmail,
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
    checkinToken: registration.checkin_token,
    ticketPrice,
    isPaidManually,
  });

  // Resend is the attendee email only. The organiser was notified on the first send.
  if (options?.resend) {
    return { sent: true };
  }

  const [{ data: paidOrders }, registrationCount] = await Promise.all([
    db
      .from("ticket_orders")
      .select("amount_minor")
      .eq("event_id", event.id)
      .eq("status", "paid"),
    getApprovedRegistrationCount(db, event.id),
  ]);
  const totalGainMinor =
    paidOrders?.reduce((sum, paidOrder) => sum + paidOrder.amount_minor, 0) ?? 0;
  const totalGain = formatMoney(totalGainMinor, order.currency);

  const coHostCommunityNames =
    collaborations
      ?.map((collaboration) => {
        const host = collaboration.community;
        if (Array.isArray(host)) return host[0]?.name;
        return host?.name;
      })
      .filter((name): name is string => Boolean(name)) ?? [];

  try {
    await sendRegistrationOrganizerNotifications({
      hostCommunityId: event.community_id,
      hostCommunityName: communityName,
      coHostCommunityNames,
      eventTitle: event.title,
      registrantName: recipientName,
      registrantEmail: recipientEmail,
      eventDate: eventDate.format("dddd, MMMM D, YYYY"),
      eventTime: eventDate.format("h:mm A z"),
      eventLink,
      ticketPrice,
      registrationCount,
      totalGain,
      paymentStatus: isPaidManually ? "marked_paid" : undefined,
    });
  } catch (error) {
    console.error("Failed to notify organisers of a paid registration:", error);
  }

  try {
    await ensureCommunityMembership({
      supabase: db,
      userId: registration.user_id,
      communityId: event.community_id,
      userEmail: recipientEmail,
      memberName: recipientName,
      skipNotification: true,
    });
  } catch (error) {
    console.error("Failed to join community after a paid registration:", error);
  }

  await db
    .from("ticket_orders")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("registration_id", registrationId)
    .is("confirmation_email_sent_at", null);

  return { sent: true };
}
