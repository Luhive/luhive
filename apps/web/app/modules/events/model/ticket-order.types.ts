import type { PaymentProvider } from "@luhive/domain/v1/community-settings";
import type { Database } from "~/shared/models/database.types";

type TicketOrderRow = Database["public"]["Tables"]["ticket_orders"]["Row"];

export type TicketOrderStatus = "pending" | "paid" | "refunded";

export type PaymentMethod = "card_transfer" | "cash";

export type TicketOrder = Pick<
  TicketOrderRow,
  | "id"
  | "community_id"
  | "event_id"
  | "registration_id"
  | "amount_minor"
  | "currency"
  | "payment_url"
  | "partner_reference"
  | "receipt_path"
> & {
  status: TicketOrderStatus;
  payment_provider: PaymentProvider;
  payment_method: PaymentMethod | null;
};

/** What the event page needs to let a user resume an unpaid registration. */
export type PendingTicketPayment =
  | { provider: "checkila"; paymentUrl: string | null }
  | {
      provider: "manual";
      registrationId: string;
      paymentInstructions: string | null;
      paymentMethod: PaymentMethod | null;
      hasReceipt: boolean;
    };

export type PaymentLink = {
  paymentUrl: string;
  paymentId: string;
};
