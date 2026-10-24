export type ProfileMemberCount = {
  communityId: string;
  memberCount: number;
};

export type ProfileOrganizerStats = {
  kind: "organizer";
  memberTotal: number;
  membersByCommunity: ProfileMemberCount[];
  newestMemberJoinedAt: string | null;
  membersJoinedThisMonth: number;
  eventsHosted: number;
  upcomingEventsHosted: number;
  communityCount: number;
};

export type ProfileMemberStats = {
  kind: "member";
  eventsRegistered: number;
  upcomingEventsRegistered: number;
  communitiesJoined: number;
  membersByCommunity: ProfileMemberCount[];
};

export type ProfileStats = ProfileOrganizerStats | ProfileMemberStats;
