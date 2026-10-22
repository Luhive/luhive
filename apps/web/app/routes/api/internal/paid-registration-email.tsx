import { timingSafeEqual } from "node:crypto";
import type { ActionFunctionArgs } from "react-router";
import { sendPaidRegistrationConfirmation } from "~/modules/events/server/payments/send-paid-registration-confirmation.server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

// Temporary. The integration API calls this after a payment is confirmed,
// because the email templates live in the web app. Fold it into the core
// ticketing slice later.

function secretMatches(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(providedBytes, expectedBytes);
}

export async function action({ request }: ActionFunctionArgs) {
  const expected = process.env.INTERNAL_API_SECRET;
  const provided = request.headers.get("x-internal-secret") ?? "";
  if (!expected || !secretMatches(provided, expected)) {
    return new Response("Not found", { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const registrationId = body?.registration_id;
  if (typeof registrationId !== "string" || registrationId.length === 0) {
    return Response.json({ error: "registration_id is required" }, { status: 400 });
  }

  const result = await sendPaidRegistrationConfirmation(
    registrationId,
    publicOrigin(request),
  );

  if (result.sent || result.reason === "already_sent" || result.reason === "not_ready") {
    return Response.json({ ok: true, ...result });
  }

  return Response.json({ ok: false, reason: result.reason }, { status: 500 });
}
