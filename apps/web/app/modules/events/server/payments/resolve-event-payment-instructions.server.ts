import * as CommunitySettings from "@luhive/domain/v1/community-settings";
import { getCommunityPaymentProvider } from "~/modules/events/server/payments/get-community-payment-provider.server";

const MAX_PAYMENT_INSTRUCTIONS_LENGTH = 2000;

type ResolveEventPaymentInstructionsResult =
  | { ok: true; instructions: string | null }
  | { ok: false; error: string };

/**
 * A priced event in a manual-payment community must tell attendees how to pay.
 * Returns the text to save, or null when the event needs none.
 */
export async function resolveEventPaymentInstructions({
  communityId,
  priceMinor,
  requestedInstructions,
}: {
  communityId: string;
  priceMinor: number | null;
  requestedInstructions: unknown;
}): Promise<ResolveEventPaymentInstructionsResult> {
  if (priceMinor === null) {
    return { ok: true, instructions: null };
  }

  const provider = await getCommunityPaymentProvider(communityId);
  if (provider !== CommunitySettings.PaymentProvider.Manual) {
    return { ok: true, instructions: null };
  }

  const instructions =
    typeof requestedInstructions === "string" ? requestedInstructions.trim() : "";
  if (!instructions) {
    return {
      ok: false,
      error: "Add payment instructions so attendees know how to pay.",
    };
  }
  if (instructions.length > MAX_PAYMENT_INSTRUCTIONS_LENGTH) {
    return {
      ok: false,
      error: `Payment instructions must be ${MAX_PAYMENT_INSTRUCTIONS_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, instructions };
}
