import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { formatMoney } from "@luhive/domain/v1/money";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { Routes } from "~/shared/lib/routing/routes";
import { sendRegistrationConfirmationEmail } from "~/shared/lib/email.server";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { GoogleMaps } from "~/modules/events/utils/google-maps";
import * as TicketOrders from "~/modules/events/data/ticket-orders-repo.server";
import { sendRegistrationOrganizerNotifications } from "~/modules/events/server/send-registration-notification.server";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Confirms the spot now and leaves the order unpaid until the organiser
 * collects the cash. Stamps the confirmation email so Mark as paid does not
 * send it again.
 */
export async function choosePayAtDoor(
  registrationId: string,
  origin: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await TicketOrders.findTicketOrderByRegistrationId(registrationId);
  if (!order || order.status !== "pending") {
    return { ok: false, error: "This registration is not waiting for payment." };
  }

  const chosen = await TicketOrders.chooseCash(order.id);
  if (!chosen) {
    return { ok: false, error: "You have already chosen how to pay." };
  }

  const db = createServiceRoleClient();
  const { data: registration } = await db
    .from("event_registrations")
    .select("user_id, event_id, checkin_token")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration?.user_id) {
    return { ok: false, error: "Registration not found." };
  }

  const checkinToken = registration.checkin_token ?? crypto.randomUUID();
  const { error: approveError } = await db
    .from("event_registrations")
    .update({
      approval_status: "approved",
      checkin_token: checkinToken,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registrationId);
  if (approveError) {
    return { ok: false, error: "Could not confirm your spot. Please try again." };
  }

  const [{ data: event }, { data: authUser }, { data: profile }] = await Promise.all([
    db
      .from("events")
      .select(
        "id, title, slug, community_id, start_time, end_time, timezone, location_address, location_name, location_place_id, online_meeting_link",
      )
      .eq("id", registration.event_id)
      .maybeSingle(),
    db.auth.admin.getUserById(registration.user_id),
    db.from("profiles").select("full_name").eq("id", registration.user_id).maybeSingle(),
  ]);

  const recipientEmail = authUser.user?.email;
  if (!event || !recipientEmail) {
    return { ok: true };
  }

  const [{ data: community }, { data: collaborations }] = await Promise.all([
    db.from("communities").select("name, slug").eq("id", event.community_id).maybeSingle(),
    db
      .from("event_collaborations")
      .select("community:communities(name)")
      .eq("event_id", event.id)
      .eq("status", "accepted")
      .neq("role", "host"),
  ]);

  const communityName = community?.name ?? "Community";
  const recipientName = profile?.full_name || recipientEmail.split("@")[0] || "there";
  const eventDate = dayjs(event.start_time).tz(event.timezone);
  const eventLink = Routes.absolute(
    origin,
    Routes.community.event(community?.slug ?? "unknown", publicEventSlug(event)),
  );
  const ticketPrice = formatMoney(order.amount_minor, order.currency);

  try {
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
      checkinToken,
      ticketPrice,
      isPayAtDoor: true,
    });
    await db
      .from("ticket_orders")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", order.id)
      .is("confirmation_email_sent_at", null);
  } catch (error) {
    console.error("Failed to send the pay-at-the-door confirmation:", error);
  }

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
      paymentStatus: "pays_at_door",
    });
  } catch (error) {
    console.error("Failed to tell organisers about a cash registration:", error);
  }

  return { ok: true };
}
