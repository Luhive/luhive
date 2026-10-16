import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";
import type { HubEventPreview } from "~/modules/hub/model/hub-v2-types";

const PREVIEW_COLUMNS =
  "id, slug, title, cover_url, start_time, end_time, timezone, location_name, location_address, location_place_id, event_type, description, price_minor, currency, communities!inner(slug, name, logo_url, verified, is_show)";

/** Same visibility as the hub list: published events from visible communities. */
export async function findHubEventPreview(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<{ preview: HubEventPreview | null; error: unknown }> {
  const { data, error } = await supabase
    .from("events")
    .select(PREVIEW_COLUMNS)
    .eq("id", eventId)
    .eq("status", "published")
    .eq("communities.is_show", true)
    .maybeSingle();

  if (error || !data) return { preview: null, error };

  const community = data.communities;

  return {
    preview: {
      id: data.id,
      slug: data.slug,
      title: data.title,
      coverUrl: data.cover_url,
      startTime: data.start_time,
      endTime: data.end_time,
      timezone: data.timezone,
      locationName: data.location_name,
      locationAddress: data.location_address,
      locationPlaceId: data.location_place_id,
      isOnline: data.event_type === "online",
      description: data.description,
      priceMinor: data.price_minor,
      currency: data.currency,
      communitySlug: community.slug,
      communityName: community.name,
      communityLogoUrl: community.logo_url,
      isCommunityVerified: community.verified ?? false,
    },
    error: null,
  };
}
