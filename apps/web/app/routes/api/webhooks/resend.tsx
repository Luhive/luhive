import { Resend } from "resend";
import type { ActionFunctionArgs } from "react-router";
import { markUnsubscribed } from "~/modules/mobile-app/data/mobile-app-waitlist-repo.server";

/**
 * Resend webhook. Only contact.updated is handled: it mirrors an unsubscribe from
 * the weekly mobile app email onto mobile_app_waitlist.unsubscribed_at, which keeps
 * the "N people subscribed" counter honest. Everything else is acknowledged and ignored.
 */
export async function action({ request }: ActionFunctionArgs) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not set");
    return new Response("Not configured", { status: 503 });
  }

  const payload = await request.text();
  let event;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      webhookSecret: secret,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
    });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  // Resend's unsubscribe is per contact, so match on email whatever segment fired it.
  if (event.type === "contact.updated") {
    await markUnsubscribed(event.data.email, event.data.unsubscribed);
  }

  return new Response(null, { status: 204 });
}

export function loader() {
  return new Response("Method Not Allowed", { status: 405 });
}
