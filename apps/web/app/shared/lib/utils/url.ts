/**
 * URL-related utilities.
 *
 * Keep these helpers small and environment-agnostic so they can be reused in
 * both server and client code without pulling in browser-only dependencies.
 */

/** Cal.com booking for community onboarding (used by Create Community CTAs). */
export const LUHIVE_CREATE_COMMUNITY_BOOKING_URL =
  "https://cal.com/luhive/30min?user=luhive";

/** WhatsApp chat with the founder, for a call or a product question. */
export const LUHIVE_FOUNDER_WHATSAPP_URL =
  "https://wa.me/message/LGGJHQTL6E3HK1";

/**
 * Builds the Cal.com booking URL, appending `source` when first-touch
 * attribution from free tools is present.
 */
export function buildCalBookingUrl(firstTouchSource: string | null): string {
  if (!firstTouchSource) return LUHIVE_CREATE_COMMUNITY_BOOKING_URL;

  const url = new URL(LUHIVE_CREATE_COMMUNITY_BOOKING_URL);
  url.searchParams.set("source", firstTouchSource);
  return url.toString();
}

/**
 * Safely parse a URL string.
 *
 * Returns a URL instance on success, or null if the value is falsy or invalid.
 */
export function safeParseUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

/**
 * Returns the hostname (without protocol) for a URL string, or null if invalid.
 */
export function getHostname(value: string | null | undefined): string | null {
  const url = safeParseUrl(value);
  return url?.hostname ?? null;
}
