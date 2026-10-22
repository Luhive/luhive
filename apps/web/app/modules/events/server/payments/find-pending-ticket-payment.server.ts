import * as CommunitySettings from "@luhive/domain/v1/community-settings";
import { findTicketOrderByRegistrationId } from "~/modules/events/data/ticket-orders-repo.server";
import { findEventPaymentInstructions } from "~/modules/events/data/event-payment-instructions-repo.server";
import type { PendingTicketPayment } from "~/modules/events/model/ticket-order.types";

/** Only call for the registrant's own registration: manual orders carry card details. */
export async function findPendingTicketPayment(
  registrationId: string,
): Promise<PendingTicketPayment | null> {
  const order = await findTicketOrderByRegistrationId(registrationId);
  if (order?.status !== "pending") return null;

  if (order.payment_provider === CommunitySettings.PaymentProvider.Manual) {
    return {
      provider: CommunitySettings.PaymentProvider.Manual,
      registrationId,
      paymentInstructions: await findEventPaymentInstructions(order.event_id),
      paymentMethod: order.payment_method,
      hasReceipt: order.receipt_path !== null,
    };
  }

  return {
    provider: CommunitySettings.PaymentProvider.Checkila,
    paymentUrl: order.payment_url,
  };
}
