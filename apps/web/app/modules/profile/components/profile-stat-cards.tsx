import type { ProfileCommunity } from "~/modules/profile/model/profile-community";
import type { ProfileStats } from "~/modules/profile/model/profile-stats";
import { ProfileStatCard } from "~/modules/profile/components/profile-stat-card";

type ProfileStatCardsProps = {
  stats: ProfileStats;
  communities: ProfileCommunity[];
};

function formatJoined(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProfileStatCards({ stats, communities }: ProfileStatCardsProps) {
  if (stats.kind === "organizer") {
    const managed = new Set(communities.filter((community) => community.canManage).map((community) => community.id));
    const joined = formatJoined(stats.newestMemberJoinedAt);
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <ProfileStatCard
          label="Members"
          value={stats.memberTotal}
          storageKey="profile-count:members"
          riseIndex={0}
          footer={joined ? `Newest member joined ${joined}` : "No members yet"}
          pill={stats.membersJoinedThisMonth > 0 ? `+${stats.membersJoinedThisMonth} this month` : null}
          segments={stats.membersByCommunity
            .filter((count) => managed.has(count.communityId))
            .map((count) => ({ id: count.communityId, value: count.memberCount }))}
        />
        <ProfileStatCard
          label="Events hosted"
          value={stats.eventsHosted}
          storageKey="profile-count:hosted"
          riseIndex={1}
          suffix={`/ ${stats.upcomingEventsHosted} upcoming`}
          footer="Communities"
          pill={String(stats.communityCount)}
        />
      </div>
    );
  }

  const past = Math.max(0, stats.eventsRegistered - stats.upcomingEventsRegistered);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ProfileStatCard
        label="Events"
        value={stats.eventsRegistered}
        storageKey="profile-count:events"
        riseIndex={0}
        suffix={`/ ${stats.upcomingEventsRegistered} upcoming`}
        footer="Registered"
        segments={[
          { id: "upcoming", value: stats.upcomingEventsRegistered },
          { id: "past", value: past },
        ]}
      />
      <ProfileStatCard
        label="Communities"
        value={stats.communitiesJoined}
        storageKey="profile-count:communities"
        riseIndex={1}
        footer="Joined"
      />
    </div>
  );
}
