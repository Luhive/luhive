import { DEFAULT_TIMEZONE } from "~/shared/lib/timezone-cookie";

export const ACTIVITY_KINDS = [
  "hosted",
  "attended",
  "registered",
  "events_created",
  "updates_sent",
  "updates_opened",
  "communities_joined",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Zero counts are omitted to keep the streamed payload small. */
export type ActivityCounts = Partial<Record<ActivityKind, number>>;

export type ActivityItem = { kind: ActivityKind; title: string };

export type ProfileActivityDay = {
  /** YYYY-MM-DD in the viewer's timezone. */
  day: string;
  counts: ActivityCounts;
  /** At most 6, events first. The counts stay exact when items are capped. */
  items: ActivityItem[];
};

export type ProfileActivity = { timezone: string; days: ProfileActivityDay[] };

export type ActivityWindow = { timezone: string; firstDay: string; today: string };

export type ActivityLevel = 0 | 1 | 2 | 3;

export type ActivityCell = { date: string; level: ActivityLevel; column: number; row: number };

export type ActivityTotals = {
  hosted: number;
  attended: number;
  updatesSent: number;
  updatesOpened: number;
};

export type ActivityMonthLabel = { label: string; column: number };

export type ActivityTooltipLine = {
  text: string;
  tone: "event" | "normal" | "muted";
};

export type ActivityTooltip = { dateLabel: string; lines: ActivityTooltipLine[] };

export const ACTIVITY_WEEKS = 52;

export const EMPTY_ACTIVITY: ProfileActivity = { timezone: DEFAULT_TIMEZONE, days: [] };

const DAY_MS = 86_400_000;
const MONTH_LABEL_MIN_GAP = 3;
const TOOLTIP_MAX_LINES = 4;

const LINE_PREFIX: Record<ActivityKind, string> = {
  hosted: "Hosted",
  attended: "Went to",
  registered: "Registered for",
  events_created: "Created",
  updates_sent: "Sent",
  updates_opened: "Opened",
  communities_joined: "Joined",
};

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

function toUtcDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

function addDays(day: string, days: number) {
  return new Date(toUtcDate(day).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function todayIn(timezone: string, now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isEventKind(kind: ActivityKind) {
  return kind === "hosted" || kind === "attended";
}

function countTotal(counts: ActivityCounts) {
  return ACTIVITY_KINDS.reduce((sum, kind) => sum + (counts[kind] ?? 0), 0);
}

/** Same arithmetic as the `bounds` CTE in migration 0008: this week's Monday minus 51 weeks, through today. */
export function activityWindow(timezone: string, now: Date): ActivityWindow {
  const today = todayIn(timezone, now);
  const daysSinceMonday = (toUtcDate(today).getUTCDay() + 6) % 7;
  const firstDay = addDays(today, -daysSinceMonday - (ACTIVITY_WEEKS - 1) * 7);
  return { timezone, firstDay, today };
}

export function activityLevel(counts: ActivityCounts): ActivityLevel {
  if ((counts.hosted ?? 0) > 0 || (counts.attended ?? 0) > 0) return 3;
  const actions = countTotal(counts);
  if (actions >= 2) return 2;
  return actions === 1 ? 1 : 0;
}

/** Column-major, Monday first. `null` marks slots after today, which keep the grid rectangular. */
export function toActivityCells(activity: ProfileActivity, window: ActivityWindow): (ActivityCell | null)[] {
  const byDay = new Map(activity.days.map((day) => [day.day, day]));

  return Array.from({ length: ACTIVITY_WEEKS * 7 }, (_, index) => {
    const date = addDays(window.firstDay, index);
    if (date > window.today) return null;
    const day = byDay.get(date);
    return {
      date,
      level: day ? activityLevel(day.counts) : 0,
      column: Math.floor(index / 7),
      row: index % 7,
    };
  });
}

export function activityTotals(activity: ProfileActivity): ActivityTotals {
  return activity.days.reduce<ActivityTotals>(
    (totals, day) => ({
      hosted: totals.hosted + (day.counts.hosted ?? 0),
      attended: totals.attended + (day.counts.attended ?? 0),
      updatesSent: totals.updatesSent + (day.counts.updates_sent ?? 0),
      updatesOpened: totals.updatesOpened + (day.counts.updates_opened ?? 0),
    }),
    { hosted: 0, attended: 0, updatesSent: 0, updatesOpened: 0 },
  );
}

/** A label on the column holding the 1st of each month, skipped when it would crowd the previous one. */
export function activityMonthLabels(window: ActivityWindow): ActivityMonthLabel[] {
  const labels: ActivityMonthLabel[] = [];

  for (let column = 0; column < ACTIVITY_WEEKS; column++) {
    const monday = addDays(window.firstDay, column * 7);
    for (let offset = 0; offset < 7; offset++) {
      const date = addDays(monday, offset);
      if (!date.endsWith("-01")) continue;
      const previous = labels[labels.length - 1];
      if (!previous || column - previous.column >= MONTH_LABEL_MIN_GAP) {
        labels.push({ label: MONTH_FORMAT.format(toUtcDate(date)), column });
      }
      break;
    }
  }

  return labels;
}

function formatTooltipDate(date: string, today: string) {
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(date));
}

export function activityTooltip(
  date: string,
  day: ProfileActivityDay | undefined,
  today: string,
): ActivityTooltip {
  const dateLabel = formatTooltipDate(date, today);
  if (!day || day.items.length === 0) {
    return { dateLabel, lines: [{ text: "No activity", tone: "muted" }] };
  }

  const lines: ActivityTooltipLine[] = day.items.slice(0, TOOLTIP_MAX_LINES).map((item) => ({
    text: `${LINE_PREFIX[item.kind]} ${item.title}`,
    tone: isEventKind(item.kind) ? "event" : "normal",
  }));

  const more = countTotal(day.counts) - lines.length;
  if (more > 0) lines.push({ text: `+${more} more`, tone: "muted" });

  return { dateLabel, lines };
}
