import type { Community as BaseCommunity } from "~/shared/models/entity.types";

export type Community = BaseCommunity & {
  memberCount: number;
  eventCount: number;
  isAdmin?: boolean;
};

export type UserData = {
  id: string;
  avatar_url?: string | null;
  full_name?: string | null;
} | null;

export type HubCommunityLogo = {
  name: string;
  logoUrl: string;
};

export type HubPreview = {
  logos: HubCommunityLogo[];
  communityCount: number;
};

export type HubEventSummary = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  startTime: string;
  endTime: string | null;
  timezone: string;
  locationName: string | null;
  isOnline: boolean;
  communitySlug: string;
  communityName: string;
};

export type HubEventPreview = HubEventSummary & {
  description: string | null;
  priceMinor: number | null;
  currency: string;
  locationAddress: string | null;
  locationPlaceId: string | null;
  communityLogoUrl: string | null;
  isCommunityVerified: boolean;
};

export type HubEventPreviewResponse = {
  preview: HubEventPreview | null;
};

/** History state carried while an event preview is open on /hub. */
export type HubEventPreviewLocationState = {
  hubEventSummary: HubEventSummary;
};

/** A community the viewer owns or administers, shown in their account menu. */
export type ManagedCommunity = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

/** The signed-in person shown in the /hub navigation. */
export type HubViewer = NonNullable<UserData> & {
  email: string | null;
  managedCommunities: ManagedCommunity[];
};

/** Loader return shape for /hub; each section streams independently. */
export type HubLoaderData = {
  viewer: Promise<HubViewer | null>;
  communities: Promise<Community[]>;
  upcomingEvents: Promise<HubEventSummary[]>;
  pastEvents: Promise<HubEventSummary[]>;
};
