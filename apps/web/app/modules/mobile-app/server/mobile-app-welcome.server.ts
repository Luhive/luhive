import { sendMobileAppWelcomeEmail } from "~/shared/lib/email.server";
import * as Waitlist from "~/modules/mobile-app/data/mobile-app-waitlist-repo.server";

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
 * Welcome email for a new signup. Never fails the signup: on error the row keeps
 * welcome_sent_at NULL and the error is logged. The weekly email is sent by hand from
 * the table, so there is no mailing-list sync here.
 */
export async function sendToNewSignup(id: string, email: string): Promise<void> {
  try {
    await withTimeout(sendMobileAppWelcomeEmail(email), WELCOME_TIMEOUT_MS);
    await Waitlist.markWelcomeSent(id);
  } catch (error) {
    console.error("Mobile app welcome failed:", error);
  }
}
