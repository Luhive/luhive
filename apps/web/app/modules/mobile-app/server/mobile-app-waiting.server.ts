import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";
import type { Community, HubEventSummary } from "~/modules/hub/model/hub-types";
import * as HubEvents from "~/modules/hub/data/hub-events-repo.server";
import * as Hub from "~/modules/hub/data/hub-repo.server";

const WAITING_ITEM_COUNT = 3;

/** "While you are waiting": the next upcoming events, or the most active communities. */
export type WhileWaiting =
  | { kind: "events"; events: HubEventSummary[] }
  | { kind: "communities"; communities: Community[] };

/**
 * Upcoming events first, from the same view the hub reads. With none on the calendar,
 * fall back to the three most active communities: most events, then most members.
 */
export async function loadWhileWaiting(
  supabase: SupabaseClient<Database>,
): Promise<WhileWaiting> {
  const { events, error } = await HubEvents.listUpcomingHubEvents(
    supabase,
    new Date(),
    WAITING_ITEM_COUNT,
  );
  if (error) console.error("Error loading upcoming events for /app:", error);
  if (events.length > 0) return { kind: "events", events };

  const { communities, error: communitiesError } = await Hub.getVisibleCommunities(supabase);
  if (communitiesError) console.error("Error loading communities for /app:", communitiesError);

  const mostActive = [...communities]
    .sort((a, b) => b.eventCount - a.eventCount || b.memberCount - a.memberCount)
    .slice(0, WAITING_ITEM_COUNT)
    .map((community) => ({ ...community, isAdmin: false }));

  return { kind: "communities", communities: mostActive };
}
