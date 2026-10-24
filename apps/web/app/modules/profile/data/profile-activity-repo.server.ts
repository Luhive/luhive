import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";
import {
  ACTIVITY_KINDS,
  type ActivityCounts,
  type ActivityItem,
  type ProfileActivity,
  type ProfileActivityDay,
} from "~/modules/profile/model/profile-activity";

type ProfileActivityRow = Database["public"]["Functions"]["profile_activity"]["Returns"][number];

function toActivityDay(row: ProfileActivityRow): ProfileActivityDay {
  const counts: ActivityCounts = {};
  for (const kind of ACTIVITY_KINDS) {
    if (row[kind] > 0) counts[kind] = row[kind];
  }
  // `items` is jsonb built by the function as [{ kind, title }].
  const items = Array.isArray(row.items) ? (row.items as ActivityItem[]) : [];
  return { day: row.day, counts, items };
}

/** Never throws: on failure the card shows its empty state and the page is unaffected. */
export async function getProfileActivity(
  supabase: SupabaseClient<Database>,
  timezone: string,
): Promise<ProfileActivity> {
  try {
    const { data, error } = await supabase.rpc("profile_activity", { p_tz: timezone });

    if (error) {
      console.error("Failed to load profile activity:", error);
      return { timezone, days: [] };
    }

    return { timezone, days: (data ?? []).map(toActivityDay) };
  } catch (error) {
    console.error("Failed to load profile activity:", error);
    return { timezone, days: [] };
  }
}
