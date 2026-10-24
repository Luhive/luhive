import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";
import type { ProfileEvent } from "~/modules/profile/model/profile-event";
import { toProfileEventStatus } from "~/modules/profile/utils/to-profile-event-status";

type CommunityRow = {
  slug: string;
  name: string;
  logo_url: string | null;
};

type EventRow = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  start_time: string;
  timezone: string;
  communities: CommunityRow | CommunityRow[] | null;
};

type RegistrationRow = {
  id: string;
  approval_status: "pending" | "approved" | "rejected" | null;
  is_attended: boolean;
  events: EventRow | EventRow[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const EVENT_FIELDS =
  "id, title, slug, cover_url, start_time, timezone, communities!events_community_id_fkey(slug, name, logo_url)";

function toProfileEvent(
  event: EventRow,
  status: ProfileEvent["status"],
): ProfileEvent | null {
  const community = first(event.communities);
  if (!community) return null;
  return {
    id: event.id,
    title: event.title,
    coverUrl: event.cover_url,
    eventSlug: event.slug,
    communitySlug: community.slug,
    communityName: community.name,
    communityLogoUrl: community.logo_url,
    startTime: event.start_time,
    timezone: event.timezone,
    status,
  };
}

async function listManagedCommunityIds(supabase: SupabaseClient<Database>, userId: string) {
  const [memberships, created] = await Promise.all([
    supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", userId)
      .in("role", ["owner", "admin"]),
    supabase.from("communities").select("id").eq("created_by", userId),
  ]);

  const ids = new Set<string>();
  for (const membership of memberships.data ?? []) {
    if (membership.community_id) ids.add(membership.community_id);
  }
  for (const community of created.data ?? []) ids.add(community.id);
  return [...ids];
}

export async function listProfileEvents(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileEvent[]> {
  const managedIds = await listManagedCommunityIds(supabase, userId);
  const now = Date.now();

  const [registrations, hosted, collaborations] = await Promise.all([
    supabase
      .from("event_registrations")
      .select(
        "id, approval_status, is_attended, events!event_registrations_event_id_fkey(id, title, slug, cover_url, start_time, timezone, communities!events_community_id_fkey(slug, name, logo_url))",
      )
      .eq("user_id", userId)
      .neq("rsvp_status", "not_going")
      .order("registered_at", { ascending: false })
      .limit(50),
    managedIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("events")
          .select(EVENT_FIELDS)
          .in("community_id", managedIds)
          .eq("status", "published")
          .order("start_time", { ascending: false })
          .limit(50),
    managedIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("event_collaborations")
          .select(`status, events!event_collaborations_event_id_fkey(${EVENT_FIELDS})`)
          .in("community_id", managedIds)
          .eq("status", "accepted")
          .limit(50),
  ]);

  if (registrations.error) console.error("Failed to load profile registrations:", registrations.error);
  if (hosted.error) console.error("Failed to load hosted profile events:", hosted.error);
  if (collaborations.error) console.error("Failed to load co-hosted profile events:", collaborations.error);

  const byEventId = new Map<string, ProfileEvent>();

  for (const row of (hosted.data ?? []) as EventRow[]) {
    const event = toProfileEvent(row, "hosted");
    if (event) byEventId.set(event.id, event);
  }

  for (const row of collaborations.data ?? []) {
    const event = first(row.events as EventRow | EventRow[] | null);
    if (!event || event.start_time == null) continue;
    const mapped = toProfileEvent(event, "hosted");
    if (mapped && !byEventId.has(mapped.id)) byEventId.set(mapped.id, mapped);
  }

  for (const row of (registrations.data ?? []) as RegistrationRow[]) {
    const event = first(row.events);
    if (!event || byEventId.has(event.id)) continue;
    const isUpcoming = new Date(event.start_time).getTime() >= now;
    const mapped = toProfileEvent(
      event,
      toProfileEventStatus({
        approvalStatus: row.approval_status,
        isAttended: row.is_attended,
        isUpcoming,
      }),
    );
    if (mapped) byEventId.set(mapped.id, mapped);
  }

  return [...byEventId.values()].sort(
    (left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime(),
  );
}
