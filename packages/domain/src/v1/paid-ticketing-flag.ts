import * as CommunitySettings from "./community-settings";

export function isPaidTicketingEnabled(settings: unknown): boolean {
  return CommunitySettings.hasFeature(
    settings,
    CommunitySettings.Feature.PaidTicketing,
  );
}
