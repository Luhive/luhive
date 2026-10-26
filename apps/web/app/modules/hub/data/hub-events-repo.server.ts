import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";
import type { HubEvent } from "~/shared/models/entity.types";
import type { HubEventSummary } from "~/modules/hub/model/hub-types";

const HUB_EVENT_COLUMNS =
  "id, slug, title, cover_url, start_time, end_time, timezone, location_name, event_type, community_slug, community_name";

/** PostgREST's default max-rows; the hub shows every published event up to it. */
const HUB_EVENT_LIMIT = 1000;

type HubEventColumns = Pick<
  HubEvent,
  | "id"
  | "slug"
  | "title"
  | "cover_url"
  | "start_time"
  | "end_time"
  | "timezone"
  | "location_name"
  | "event_type"
  | "community_slug"
  | "community_name"
>;

function toHubEventSummary(row: HubEventColumns): HubEventSummary | null {
  if (
    row.id == null ||
    row.slug == null ||
    row.title == null ||
    row.start_time == null ||
    row.timezone == null ||
    row.community_slug == null ||
    row.community_name == null
  ) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverUrl: row.cover_url,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    locationName: row.location_name,
    isOnline: row.event_type === "online",
    communitySlug: row.community_slug,
    communityName: row.community_name,
  };
}

function toHubEventSummaries(rows: HubEventColumns[] | null) {
  return (rows ?? []).flatMap((row) => {
    const event = toHubEventSummary(row);
    return event ? [event] : [];
  });
}

/** Events still running count as upcoming, so a live event stays on the hub. */
export async function listUpcomingHubEvents(
  supabase: SupabaseClient<Database>,
  now: Date,
  limit = HUB_EVENT_LIMIT,
) {
  const nowIso = now.toISOString();
  const { data, error } = await supabase
    .from("hub_events")
    .select(HUB_EVENT_COLUMNS)
    .or(`end_time.gte.${nowIso},and(end_time.is.null,start_time.gte.${nowIso})`)
    .order("start_time", { ascending: true })
    .limit(limit);

  return { events: toHubEventSummaries(data), error };
}

export async function listPastHubEvents(
  supabase: SupabaseClient<Database>,
  now: Date,
) {
  const nowIso = now.toISOString();
  const { data, error } = await supabase
    .from("hub_events")
    .select(HUB_EVENT_COLUMNS)
    .or(`end_time.lt.${nowIso},and(end_time.is.null,start_time.lt.${nowIso})`)
    .order("start_time", { ascending: false })
    .limit(HUB_EVENT_LIMIT);

  return { events: toHubEventSummaries(data), error };
}
