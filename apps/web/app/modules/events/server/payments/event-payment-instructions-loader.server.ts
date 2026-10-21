import type { LoaderFunctionArgs } from "react-router";
import { findEventPaymentInstructions } from "~/modules/events/data/event-payment-instructions-repo.server";
import { requireEventManager } from "~/modules/events/server/require-event-manager.server";

/** Lets the edit form show the saved instructions to the event's managers. */
export async function eventPaymentInstructionsLoader({ request }: LoaderFunctionArgs) {
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) {
    return Response.json({ error: "Missing eventId" }, { status: 400 });
  }

  const manager = await requireEventManager(request, eventId);
  if (!manager.ok) {
    const status = manager.error === "Unauthorized" ? 401 : 403;
    return Response.json({ error: manager.error }, { status });
  }

  const instructions = await findEventPaymentInstructions(eventId);
  return Response.json({ instructions });
}
