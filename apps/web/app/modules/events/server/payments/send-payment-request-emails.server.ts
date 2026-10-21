import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as CommunitySettings from "@luhive/domain/v1/community-settings";
import { formatMoney } from "@luhive/domain/v1/money";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { Routes } from "~/shared/lib/routing/routes";
import { sendPaymentRequestEmail } from "~/shared/lib/email.server";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { findEventPaymentInstructions } from "~/modules/events/data/event-payment-instructions-repo.server";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * For a new manual-payment registration: tells the attendee how to pay.
 * Organisers are told later, when a receipt arrives or cash is chosen.
 * Failures are logged, never thrown; the registration already exists.
 */
export async function sendPaymentRequestEmails(
  registrationId: string,
  origin: string,
): Promise<void> {
  const db = createServiceRoleClient();

  const { data: registration } = await db
    .from("event_registrations")
    .select("id, event_id, user_id, approval_status")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration?.user_id || registration.approval_status !== "pending") return;

  const { data: order } = await db
    .from("ticket_orders")
    .select("status, amount_minor, currency, payment_provider")
    .eq("registration_id", registrationId)
    .maybeSingle();
  if (
    order?.status !== "pending" ||
    order.payment_provider !== CommunitySettings.PaymentProvider.Manual
  ) {
    return;
  }

  const [{ data: event }, { data: authUser }, { data: profile }] = await Promise.all([
    db
      .from("events")
      .select("id, title, slug, community_id, start_time, timezone")
      .eq("id", registration.event_id)
      .maybeSingle(),
    db.auth.admin.getUserById(registration.user_id),
    db
      .from("profiles")
      .select("full_name")
      .eq("id", registration.user_id)
      .maybeSingle(),
  ]);
  const recipientEmail = authUser.user?.email;
  if (!event || !recipientEmail) return;

  const [{ data: community }, paymentInstructions] = await Promise.all([
    db
      .from("communities")
      .select("name, slug")
      .eq("id", event.community_id)
      .maybeSingle(),
    findEventPaymentInstructions(event.id),
  ]);

  const communityName = community?.name ?? "Community";
  const recipientName =
    profile?.full_name || recipientEmail.split("@")[0] || "there";
  const eventStart = dayjs(event.start_time).tz(event.timezone);
  const eventDate = eventStart.format("dddd, MMMM D, YYYY");
  const eventTime = eventStart.format("h:mm A z");
  const eventLink = Routes.absolute(
    origin,
    Routes.community.event(community?.slug ?? "unknown", publicEventSlug(event)),
  );
  const ticketPrice = formatMoney(order.amount_minor, order.currency);

  try {
    await sendPaymentRequestEmail({
      eventTitle: event.title,
      communityName,
      eventLink,
      recipientName,
      recipientEmail,
      ticketPrice,
      paymentInstructions,
      eventDate,
      eventTime,
    });
  } catch (error) {
    console.error("Failed to send the payment request email:", error);
  }

}
