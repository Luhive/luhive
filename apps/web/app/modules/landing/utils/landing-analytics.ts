import { analytics } from "~/shared/lib/analytics/analytics";

/** `placement` is where on the page the click happened: "header", "hero", "pricing_free", ... */
export const trackBookDemoClicked = (placement: string) =>
  analytics.track("landing_book_demo_clicked", { placement });

export const trackHubClicked = (placement: string) =>
  analytics.track("landing_hub_clicked", { placement });

export const trackSocialLinkClicked = (platform: string) =>
  analytics.track("landing_social_link_clicked", { platform });

export const trackToolClicked = (tool: string) =>
  analytics.track("landing_tool_clicked", { tool });

export const trackProfileClaimClicked = () =>
  analytics.track("landing_profile_claim_clicked", { placement: "hero" });
