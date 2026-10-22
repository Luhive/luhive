import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  findTicketOrderByRegistrationId,
  listTicketOrderStatusesForEvent,
  refund as refundTicketOrder,
} from "~/modules/events/data/ticket-orders-repo.server";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { requireEventManager } from "~/modules/events/server/require-event-manager.server";
import { confirmTicketOrder } from "~/modules/events/server/payments/confirm-ticket-order.server";
import { sendPaidRegistrationConfirmation } from "~/modules/events/server/payments/send-paid-registration-confirmation.server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) {
    return Response.json({ error: "Missing eventId" }, { status: 400 });
  }

  const manager = await requireEventManager(request, eventId);
  if (!manager.ok) {
    const status = manager.error === "Unauthorized" ? 401 : 403;
    return Response.json({ error: manager.error }, { status });
  }

  const orders = await listTicketOrderStatusesForEvent(eventId);
  return Response.json({ orders });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const registrationId = formData.get("registrationId");
  const eventId = formData.get("eventId");
  const intent = formData.get("intent");

  if (
    typeof registrationId !== "string" ||
    typeof eventId !== "string" ||
    (intent !== "mark-paid" && intent !== "resend" && intent !== "refund")
  ) {
    return { success: false, error: "Missing required fields" };
  }

  const manager = await requireEventManager(request, eventId);
  if (!manager.ok) {
    return { success: false, error: manager.error };
  }

  const order = await findTicketOrderByRegistrationId(registrationId);
  if (!order || order.event_id !== eventId) {
    return { success: false, error: "Ticket order not found" };
  }

  const origin = publicOrigin(request);

  if (intent === "refund") {
    if (order.status !== "paid") {
      return { success: false, error: "Only a paid ticket can be refunded" };
    }
    const refunded = await refundTicketOrder(order.id);
    if (!refunded) {
      return { success: false, error: "This ticket cannot be refunded" };
    }
    const { error: registrationError } = await createServiceRoleClient()
      .from("event_registrations")
      .update({
        approval_status: "rejected",
        checkin_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId);
    if (registrationError) {
      console.error("Refunded the ticket, but the registration stayed approved:", registrationError);
    }
    return {
      success: true,
      message: "Refunded. Return the money yourself. Their ticket no longer works.",
    };
  }

  if (intent === "resend") {
    if (order.status !== "paid") {
      return { success: false, error: "This ticket has not been paid" };
    }
    const result = await sendPaidRegistrationConfirmation(registrationId, origin, {
      resend: true,
    });
    if (!result.sent) {
      return { success: false, error: "Could not send the confirmation email" };
    }
    return { success: true, message: "Confirmation sent" };
  }

  if (order.status === "refunded") {
    return { success: false, error: "This ticket cannot be marked as paid" };
  }

  const outcome = await confirmTicketOrder({
    registrationId,
    paidVia: "manual",
    markedPaidBy: manager.userId,
  });
  if (outcome === "not_found" || outcome === "conflict") {
    return { success: false, error: "This ticket cannot be marked as paid" };
  }

  try {
    await sendPaidRegistrationConfirmation(registrationId, origin);
  } catch (error) {
    console.error("Marked a ticket paid, but the confirmation email failed:", error);
    return {
      success: true,
      message: "Marked as paid, but the confirmation email failed",
    };
  }

  return { success: true, message: "Marked as paid" };
}
