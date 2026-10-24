import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";
import type { ProfileCommunity } from "~/modules/profile/model/profile-community";
import type { ProfileMemberCount, ProfileStats } from "~/modules/profile/model/profile-stats";

function startOfThisMonth() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

async function countMembersByCommunity(
  supabase: SupabaseClient<Database>,
  communityIds: string[],
): Promise<ProfileMemberCount[]> {
  if (communityIds.length === 0) return [];

  const counts = await Promise.all(
    communityIds.map(async (communityId) => {
      const { count, error } = await supabase
        .from("community_members")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId);

      if (error) console.error("Failed to count community members:", error);
      return { communityId, memberCount: count ?? 0 };
    }),
  );

  return counts;
}

function emptyMemberStats(communitiesJoined: number): ProfileStats {
  return {
    kind: "member",
    eventsRegistered: 0,
    upcomingEventsRegistered: 0,
    communitiesJoined,
    membersByCommunity: [],
  };
}

export async function getProfileStats(
  supabase: SupabaseClient<Database>,
  userId: string,
  communities: ProfileCommunity[],
): Promise<ProfileStats> {
  const membersByCommunity = await countMembersByCommunity(
    supabase,
    communities.map((community) => community.id),
  );
  const managedIds = communities.filter((community) => community.canManage).map((community) => community.id);

  if (managedIds.length === 0) {
    const { data, error } = await supabase
      .from("event_registrations")
      .select("rsvp_status, events!event_registrations_event_id_fkey(start_time)")
      .eq("user_id", userId)
      .neq("rsvp_status", "not_going");

    if (error) {
      console.error("Failed to load profile registration stats:", error);
      return { ...emptyMemberStats(communities.length), membersByCommunity };
    }

    const now = Date.now();
    let upcomingEventsRegistered = 0;
    for (const registration of data ?? []) {
      const event = registration.events;
      const startTime = Array.isArray(event) ? event[0]?.start_time : event?.start_time;
      if (startTime && new Date(startTime).getTime() >= now) upcomingEventsRegistered += 1;
    }

    return {
      kind: "member",
      eventsRegistered: data?.length ?? 0,
      upcomingEventsRegistered,
      communitiesJoined: communities.length,
      membersByCommunity,
    };
  }

  const nowIso = new Date().toISOString();
  const managedCounts = membersByCommunity.filter((count) => managedIds.includes(count.communityId));

  const [newestMember, joinedThisMonth, hosted, upcomingHosted] = await Promise.all([
    supabase
      .from("community_members")
      .select("joined_at")
      .in("community_id", managedIds)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("community_members")
      .select("id", { count: "exact", head: true })
      .in("community_id", managedIds)
      .gte("joined_at", startOfThisMonth()),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .in("community_id", managedIds)
      .eq("status", "published"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .in("community_id", managedIds)
      .eq("status", "published")
      .gte("start_time", nowIso),
  ]);

  if (newestMember.error) console.error("Failed to load newest member:", newestMember.error);
  if (joinedThisMonth.error) console.error("Failed to count new members:", joinedThisMonth.error);
  if (hosted.error) console.error("Failed to count hosted events:", hosted.error);
  if (upcomingHosted.error) console.error("Failed to count upcoming hosted events:", upcomingHosted.error);

  return {
    kind: "organizer",
    memberTotal: managedCounts.reduce((sum, count) => sum + count.memberCount, 0),
    membersByCommunity,
    newestMemberJoinedAt: newestMember.data?.joined_at ?? null,
    membersJoinedThisMonth: joinedThisMonth.count ?? 0,
    eventsHosted: hosted.count ?? 0,
    upcomingEventsHosted: upcomingHosted.count ?? 0,
    communityCount: managedIds.length,
  };
}
