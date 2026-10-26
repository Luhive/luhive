import { createAnalytics } from "~/shared/lib/analytics/create-analytics";
import { createUmamiProvider } from "~/shared/lib/analytics/providers/umami-provider";
import { createGoogleAnalyticsProvider } from "~/shared/lib/analytics/providers/google-analytics-provider";

export const analytics = createAnalytics([
  createUmamiProvider(),
  createGoogleAnalyticsProvider("G-EM0ZMM2JPL"),
]);

/** For events that must stay out of GA4 (e.g. the mobile app waitlist). */
export const umamiAnalytics = createAnalytics([createUmamiProvider()]);
