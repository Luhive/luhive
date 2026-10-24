import type { ActionFunctionArgs } from "react-router";
import * as CommunitySettings from "@luhive/domain/v1/community-settings";
import { createClient, createServiceRoleClient } from "~/shared/lib/supabase/server";
import { formatMoney } from "@luhive/domain/v1/money";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import * as TicketOrders from "~/modules/events/data/ticket-orders-repo.server";
import * as PaymentReceipts from "~/modules/events/data/payment-receipts-storage.server";
import { choosePayAtDoor } from "~/modules/events/server/payments/choose-pay-at-door.server";
import { sendRegistrationOrganizerNotifications } from "~/modules/events/server/send-registration-notification.server";
import type { TicketOrder } from "~/modules/events/model/ticket-order.types";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

dayjs.extend(utc);
dayjs.extend(timezone);

type OwnedOrder =
  | { ok: true; order: TicketOrder; userId: string }
  | { ok: false; error: string };

async function requireOwnPendingManualOrder(
  request: Request,
  registrationId: string,
): Promise<OwnedOrder> {
  const { supabase } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be logged in." };

  const { data: registration } = await supabase
    .from("event_registrations")
    .select("user_id")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration || registration.user_id !== user.id) {
    return { ok: false, error: "Registration not found." };
  }

  const order = await TicketOrders.findTicketOrderByRegistrationId(registrationId);
  if (
    !order ||
    order.status !== "pending" ||
    order.payment_provider !== CommunitySettings.PaymentProvider.Manual
  ) {
    return { ok: false, error: "This registration is not waiting for payment." };
  }

  return { ok: true, order, userId: user.id };
}

export async function ticketPaymentAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const registrationId = formData.get("registrationId");
  if (typeof registrationId !== "string") {
    return { success: false, error: "Missing registration." };
  }

  const owned = await requireOwnPendingManualOrder(request, registrationId);
  if (!owned.ok) return { success: false, error: owned.error };

  if (intent === "pay-at-door") {
    if (owned.order.payment_method === "card_transfer") {
      return { success: false, error: "You have already sent a receipt." };
    }
    const result = await choosePayAtDoor(registrationId, publicOrigin(request));
    return result.ok
      ? { success: true, message: "Your spot is confirmed. Pay cash at the door." }
      : { success: false, error: result.error };
  }

  if (intent !== "upload-receipt") {
    return { success: false, error: "Unknown action." };
  }
  if (owned.order.payment_method === "cash") {
    return { success: false, error: "You chose to pay cash at the door." };
  }

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a receipt to upload." };
  }

  const stored = await PaymentReceipts.upload({
    eventId: owned.order.event_id,
    registrationId,
    file,
  });
  if (!stored.ok) return { success: false, error: stored.error };

  const previousPath = owned.order.receipt_path;
  await TicketOrders.saveReceipt(owned.order.id, stored.path);
  if (previousPath && previousPath !== stored.path) {
    await PaymentReceipts.remove(previousPath);
  }

  if (!previousPath) {
    await notifyReceiptSent(owned.order, publicOrigin(request));
  }

  return { success: true, message: "Receipt sent. The organiser will confirm your spot." };
}

async function notifyReceiptSent(order: TicketOrder, origin: string) {
  try {
    const db = createServiceRoleClient();
    const { data: registration } = await db
      .from("event_registrations")
      .select("user_id")
      .eq("id", order.registration_id)
      .maybeSingle();
    if (!registration?.user_id) return;

    const [{ data: event }, { data: authUser }, { data: profile }, { data: community }] =
      await Promise.all([
        db
          .from("events")
          .select("id, title, slug, community_id, start_time, timezone")
          .eq("id", order.event_id)
          .maybeSingle(),
        db.auth.admin.getUserById(registration.user_id),
        db.from("profiles").select("full_name").eq("id", registration.user_id).maybeSingle(),
        db.from("communities").select("name, slug").eq("id", order.community_id).maybeSingle(),
      ]);
    const recipientEmail = authUser.user?.email;
    if (!event || !recipientEmail) return;

    const { data: collaborations } = await db
      .from("event_collaborations")
      .select("community:communities(name)")
      .eq("event_id", order.event_id)
      .eq("status", "accepted")
      .neq("role", "host");

    const eventStart = dayjs(event.start_time).tz(event.timezone);
    await sendRegistrationOrganizerNotifications({
      hostCommunityId: event.community_id,
      hostCommunityName: community?.name ?? "Community",
      coHostCommunityNames:
        collaborations
          ?.map((collaboration) => {
            const host = collaboration.community;
            if (Array.isArray(host)) return host[0]?.name;
            return host?.name;
          })
          .filter((name): name is string => Boolean(name)) ?? [],
      eventTitle: event.title,
      registrantName: profile?.full_name || recipientEmail.split("@")[0] || "there",
      registrantEmail: recipientEmail,
      eventDate: eventStart.format("dddd, MMMM D, YYYY"),
      eventTime: eventStart.format("h:mm A z"),
      eventLink: Routes.absolute(
        origin,
        Routes.community.event(community?.slug ?? "unknown", publicEventSlug(event)),
      ),
      ticketPrice: formatMoney(order.amount_minor, order.currency),
      paymentStatus: "receipt_sent",
    });
  } catch (error) {
    console.error("Failed to tell organisers a receipt arrived:", error);
  }
}
