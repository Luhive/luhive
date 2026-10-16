import type { Community, UserData } from "~/modules/hub/model/hub-types";

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

/** History state carried while an event preview is open on /hubv2. */
export type HubEventPreviewLocationState = {
  hubEventSummary: HubEventSummary;
};

/** The signed-in person shown in the /hubv2 navigation. */
export type HubViewer = NonNullable<UserData> & {
  email: string | null;
};

/** Loader return shape for /hubv2; each section streams independently. */
export type HubV2LoaderData = {
  viewer: Promise<HubViewer | null>;
  communities: Promise<Community[]>;
  upcomingEvents: Promise<HubEventSummary[]>;
  pastEvents: Promise<HubEventSummary[]>;
};
