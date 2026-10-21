import {
  deletePendingTicketOrder,
  findTicketOrderByRegistrationId,
} from "~/modules/events/data/ticket-orders-repo.server";
import * as PaymentReceipts from "~/modules/events/data/payment-receipts-storage.server";

type ReleaseTicketOrderResult = { ok: true } | { ok: false; error: string };

/**
 * A registration can only be deleted once its ticket order is out of the way.
 * Unpaid orders are removed here; paid ones block the cancellation because the
 * refund happens outside Luhive.
 *
 * The order must belong to `eventId`, so a caller who was authorised for one
 * event cannot release another event's order by passing a foreign registration.
 */
export async function releaseTicketOrderForCancellation(input: {
  registrationId: string;
  eventId: string;
}): Promise<ReleaseTicketOrderResult> {
  const order = await findTicketOrderByRegistrationId(input.registrationId);
  if (!order || order.event_id !== input.eventId) return { ok: true };

  if (order.status === "pending") {
    if (order.receipt_path) {
      await PaymentReceipts.remove(order.receipt_path);
    }
    await deletePendingTicketOrder(input.registrationId);
    return { ok: true };
  }

  return {
    ok: false,
    error:
      "This ticket has been paid, so it can't be cancelled here.",
  };
}
