const DAY_MS = 86_400_000;
const WEEK_KEY_PATTERN = /^(\d{4})-W(\d{2})$/;

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function mondayIndex(date: Date) {
  return (date.getUTCDay() + 6) % 7;
}

/** Monday of ISO week 1: the week that contains January 4th. */
function firstIsoMonday(isoYear: number) {
  const january4 = utcDate(isoYear, 0, 4);
  return utcDate(isoYear, 0, 4 - mondayIndex(january4));
}

/** ISO week key such as `2026-W42` for the calendar date of `date` in UTC. */
export function formatHubOgWeekKey(date: Date) {
  const thursday = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 3 - mondayIndex(date));
  const isoYear = thursday.getUTCFullYear();
  const week = 1 + Math.round((thursday.getTime() - firstIsoMonday(isoYear).getTime() - 3 * DAY_MS) / (7 * DAY_MS));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Monday 00:00 UTC of the ISO week, or null when the key is malformed. */
export function findHubOgWeekStart(weekKey: string): Date | null {
  const match = WEEK_KEY_PATTERN.exec(weekKey);
  if (!match) return null;
  const isoYear = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;

  const monday = new Date(firstIsoMonday(isoYear).getTime() + (week - 1) * 7 * DAY_MS);
  return formatHubOgWeekKey(monday) === weekKey ? monday : null;
}
