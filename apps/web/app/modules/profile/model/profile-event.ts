export type ProfileEventStatus = "hosted" | "going" | "pending" | "declined" | "attended" | "registered";

export type ProfileEvent = {
  id: string;
  title: string;
  coverUrl: string | null;
  eventSlug: string;
  communitySlug: string;
  communityName: string;
  communityLogoUrl: string | null;
  startTime: string;
  timezone: string;
  status: ProfileEventStatus;
};
