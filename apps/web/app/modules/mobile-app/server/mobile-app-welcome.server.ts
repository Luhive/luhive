import {
  addMobileAppWaitlistContact,
  sendMobileAppWelcomeEmail,
} from "~/shared/lib/email.server";
import { markWelcomeSent } from "~/modules/mobile-app/data/mobile-app-waitlist-repo.server";

const WELCOME_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms),
    ),
  ]);
}

/**
 * Welcome email plus the Resend contact the weekly email goes to. Never fails
 * the signup: on error the row keeps welcome_sent_at NULL and the error is logged.
 */
export async function welcomeNewSignup(id: string, email: string): Promise<void> {
  try {
    const [, contactId] = await withTimeout(
      Promise.all([sendMobileAppWelcomeEmail(email), addMobileAppWaitlistContact(email)]),
      WELCOME_TIMEOUT_MS,
    );
    await markWelcomeSent(id, contactId);
  } catch (error) {
    console.error("Mobile app welcome failed:", error);
  }
}

/** A returning signup who had unsubscribed: back into the segment, no second welcome. */
export async function resubscribeContact(email: string): Promise<void> {
  try {
    await withTimeout(addMobileAppWaitlistContact(email), WELCOME_TIMEOUT_MS);
  } catch (error) {
    console.error("Mobile app resubscribe failed:", error);
  }
}
