// Values match the CHECK constraint on public.mobile_app_waitlist.first_feature.
export const FEATURE_OPTIONS = [
  { value: "event_notifications", label: "Event notifications" },
  { value: "qr_tickets", label: "QR tickets" },
  { value: "discover_events", label: "Discover new events" },
] as const;

export type Feature = (typeof FEATURE_OPTIONS)[number]["value"];

export function parseFeature(value: unknown): Feature | null {
  return FEATURE_OPTIONS.find((o) => o.value === value)?.value ?? null;
}

/**
 * Display offset added to real signups in "N people subscribed".
 * A deliberate product decision (26 Oct 2026, docs/mobile-app-waitlist.md).
 */
export const COUNTER_BASE = 50;

export type WaitlistIntent = "join" | "answer";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const INVALID_EMAIL_MESSAGE = "Please enter a valid email address.";

/** The one email rule, shared by the action and the optimistic client check. */
export function isValidWaitlistEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email) && email.length <= 320;
}
