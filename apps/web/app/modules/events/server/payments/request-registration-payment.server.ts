import * as CommunitySettings from "@luhive/domain/v1/community-settings";
import type { Event } from "~/shared/models/entity.types";
import type { EventRegistrationState } from "~/modules/events/model/event-detail-view.types";
import type { TicketOrder } from "~/modules/events/model/ticket-order.types";
import { startTicketPayment } from "~/modules/events/server/payments/start-ticket-payment.server";

type RequestRegistrationPaymentInput = {
  event: Event;
  registrationId: string;
  registrationCount: number;
  existingOrder?: TicketOrder | null;
  eventReturnUrl?: string;
};

export type RegistrationPaymentOutcome =
  | {
      success: true;
      message: string;
      provider: CommunitySettings.PaymentProvider;
      /** Null for manual payment: there is nowhere to send the user. */
      paymentUrl: string | null;
      registrationState: EventRegistrationState;
      registeredEventCommunityId: string;
    }
  | {
      success: false;
      error: string;
      registrationState: EventRegistrationState;
      registeredEventCommunityId: string;
    };

/**
 * Turns an unpaid registration into "go and pay": the registration stays
 * pending. Checkila returns a payment link; manual payment returns none and
 * the event page shows the organiser's instructions. Registration
 * confirmation emails and the check-in token wait until the payment is
 * confirmed.
 */
export async function requestRegistrationPayment({
  event,
  registrationId,
  registrationCount,
  existingOrder,
  eventReturnUrl,
}: RequestRegistrationPaymentInput): Promise<RegistrationPaymentOutcome> {
  const registrationState: EventRegistrationState = {
    isUserRegistered: true,
    userRegistrationStatus: "pending",
    userCheckinToken: null,
    registrationCount,
  };

  const payment = await startTicketPayment({
    event,
    registrationId,
    existingOrder,
    eventReturnUrl,
  });

  if (!payment.ok) {
    return {
      success: false,
      error: payment.error,
      registrationState,
      registeredEventCommunityId: event.community_id,
    };
  }

  return {
    success: true,
    message:
      payment.provider === CommunitySettings.PaymentProvider.Manual
        ? "You're registered. Pay using the instructions to confirm your spot."
        : "Continue to payment to confirm your registration.",
    provider: payment.provider,
    paymentUrl: payment.paymentUrl,
    registrationState,
    registeredEventCommunityId: event.community_id,
  };
}
