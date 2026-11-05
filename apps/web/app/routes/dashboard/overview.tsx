export { meta } from "~/modules/dashboard/model/overview-meta";

import { Suspense, useEffect, useState } from "react";
import { Await, useLoaderData } from "react-router";
import { isPaidTicketingEnabled } from "@luhive/domain/v1/paid-ticketing-flag";
import { SectionCards } from "~/modules/dashboard/components/section-cards";
import { DataTable } from "~/modules/dashboard/components/data-table";
import { JoinedUsersChart } from "~/modules/dashboard/components/joined-users-chart";
import {
  getCommunityBySlugClient,
  getMembersForCommunityClient,
  getStatsForCommunityClient,
  getVisitsForCommunityClient,
  type CommunityVisit,
} from "~/modules/dashboard/data/dashboard-repo.client";
import type { EventListRevenue } from "~/modules/events/model/event-revenue.types";
import type { Member, DashboardStatsData } from "~/modules/dashboard/model/dashboard-types";
import { useDashboardContext } from "~/modules/dashboard/hooks/use-dashboard-context";
import { useMemberRoleActions } from "~/modules/dashboard/hooks/use-member-role-actions";
import { CommunityInviteSheet } from "~/modules/dashboard/components/community-invite-sheet";

type OverviewLoaderData = {
  members: Member[];
  visits: CommunityVisit[];
  stats: DashboardStatsData;
  revenue: Promise<EventListRevenue | null> | null;
};

function PublishOverviewRevenue({
  data,
  onReady,
}: {
  data: EventListRevenue | null;
  onReady: (data: EventListRevenue) => void;
}) {
  useEffect(() => {
    if (data) onReady(data);
  }, [data, onReady]);

  return null;
}

async function clientLoader({
  params,
}: {
  params: { slug?: string };
}): Promise<OverviewLoaderData> {
  const slug = params.slug;
  if (!slug) {
    return {
      members: [],
      visits: [],
      stats: { totalVisits: 0, uniqueVisitors: 0, joinedUsers: 0 },
      revenue: null,
    };
  }

  const { community, error: communityError } =
    await getCommunityBySlugClient(slug);

  if (communityError || !community) {
    return {
      members: [],
      visits: [],
      stats: { totalVisits: 0, uniqueVisitors: 0, joinedUsers: 0 },
      revenue: null,
    };
  }

  const revenue = isPaidTicketingEnabled(community.settings)
    ? fetch(
        `/api/events/community-ticket-revenue?communityId=${encodeURIComponent(community.id)}`,
        { cache: "no-store" },
      ).then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as EventListRevenue;
      })
    : null;

  const [membersResult, visitsResult, stats] = await Promise.all([
    getMembersForCommunityClient(community.id),
    getVisitsForCommunityClient(community.id),
    getStatsForCommunityClient(community.id),
  ]);

  return {
    members: membersResult.error ? [] : membersResult.members,
    visits: visitsResult.error ? [] : visitsResult.visits,
    stats,
    revenue,
  };
}

export { clientLoader };

export default function DashboardOverviewPage() {
  const { members, visits, stats, revenue } = useLoaderData<OverviewLoaderData>();
  const { community, role } = useDashboardContext();
  const [revenueTotal, setRevenueTotal] = useState<EventListRevenue | null>(null);
  const showRevenue = isPaidTicketingEnabled(community.settings);
  const { promoteMember, demoteMember, updatingMemberId } = useMemberRoleActions(
    community.id,
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {revenue && (
        <Suspense fallback={null}>
          <Await resolve={revenue}>
            {(data) => (
              <PublishOverviewRevenue data={data} onReady={setRevenueTotal} />
            )}
          </Await>
        </Suspense>
      )}
      <SectionCards
        stats={stats}
        showRevenue={showRevenue}
        revenue={
          revenueTotal
            ? {
                totalRevenueMinor: revenueTotal.totalRevenueMinor,
                currency: revenueTotal.currency,
              }
            : null
        }
      />
      <div className="px-4 lg:px-6">
        <JoinedUsersChart members={members} visits={visits} />
      </div>
      <div className="px-4 lg:px-6">
        <DataTable
          data={members}
          canManageRoles={role === "owner"}
          updatingMemberId={updatingMemberId}
          onPromote={promoteMember}
          onDemote={demoteMember}
          toolbarAction={
            role === "owner" ? <CommunityInviteSheet communityId={community.id} /> : null
          }
        />
      </div>
    </div>
  );
}
