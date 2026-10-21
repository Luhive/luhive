import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import * as TicketOrders from "~/modules/events/data/ticket-orders-repo.server";
import * as PaymentReceipts from "~/modules/events/data/payment-receipts-storage.server";
import { requireEventManager } from "~/modules/events/server/require-event-manager.server";

/** A short-lived link, only for someone who manages the event. */
export async function ticketReceiptLoader({ request }: LoaderFunctionArgs) {
  const registrationId = new URL(request.url).searchParams.get("registrationId");
  if (!registrationId) {
    return Response.json({ error: "Missing registrationId" }, { status: 400 });
  }

  const order = await TicketOrders.findTicketOrderByRegistrationId(registrationId);
  if (!order?.receipt_path) {
    return Response.json({ error: "No receipt" }, { status: 404 });
  }

  const manager = await requireEventManager(request, order.event_id);
  if (!manager.ok) {
    const status = manager.error === "Unauthorized" ? 401 : 403;
    return Response.json({ error: manager.error }, { status });
  }

  const url = await PaymentReceipts.createViewUrl(order.receipt_path);
  if (!url) {
    return Response.json({ error: "Could not open the receipt" }, { status: 500 });
  }

  return redirect(url);
}
