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
  communitySlug: string;
  communityName: string;
};

export type HubEventPreview = HubEventSummary & {
  description: string | null;
  priceMinor: number | null;
  currency: string;
  locationAddress: string | null;
  isOnline: boolean;
  communityLogoUrl: string | null;
  isCommunityVerified: boolean;
};

export type HubEventPreviewResponse = {
  preview: HubEventPreview | null;
};

/** Temporary drawer layout comparison, see `get-event-preview-layout`. */
export type EventPreviewLayout = "panel" | "stretch" | "wide";

/** History state carried while an event preview is open on /hubv2. */
export type HubEventPreviewLocationState = {
  hubEventSummary: HubEventSummary;
};

/** Loader return shape for /hubv2; each section streams independently. */
export type HubV2LoaderData = {
  viewer: Promise<UserData>;
  communities: Promise<Community[]>;
  upcomingEvents: Promise<HubEventSummary[]>;
  pastEvents: Promise<HubEventSummary[]>;
};
