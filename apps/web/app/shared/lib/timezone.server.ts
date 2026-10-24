import { DEFAULT_TIMEZONE, readTimezoneCookie } from "~/shared/lib/timezone-cookie";

/**
 * The viewer's IANA timezone from the `lh_tz` cookie set in root.tsx.
 * Client-set — validated before use, `Asia/Baku` on the first visit or when invalid.
 */
export function readTimezone(request: Request): string {
  return readTimezoneCookie(request.headers.get("Cookie")) ?? DEFAULT_TIMEZONE;
}
