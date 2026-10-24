export const TIMEZONE_COOKIE = "lh_tz";
export const DEFAULT_TIMEZONE = "Asia/Baku";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isValidTimezone(timezone: string) {
  if (timezone.length === 0 || timezone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function readTimezoneCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)lh_tz=([^;]*)/);
  if (!match?.[1]) return null;

  try {
    const timezone = decodeURIComponent(match[1]);
    return isValidTimezone(timezone) ? timezone : null;
  } catch {
    return null;
  }
}

/** Client only. Day-bucketed views read this so a day starts at the viewer's midnight. */
export function rememberBrowserTimezone() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timezone || readTimezoneCookie(document.cookie) === timezone) return;
  document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(timezone)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
