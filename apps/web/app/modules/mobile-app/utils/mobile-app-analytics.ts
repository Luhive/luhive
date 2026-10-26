import { createAnalytics } from "~/shared/lib/analytics/create-analytics";
import { createUmamiProvider } from "~/shared/lib/analytics/providers/umami-provider";
import { isInAppBrowser } from "~/shared/lib/is-in-app-browser";

// Umami only: this page's events never go to GA4 (docs/mobile-app-waitlist.md §7).
const umami = createAnalytics([createUmamiProvider()]);

function inAppBrowser(): boolean {
  return typeof navigator !== "undefined" && isInAppBrowser(navigator.userAgent);
}

export const trackEmailFocused = () =>
  umami.track("mobile_app_email_focused", { in_app_browser: inAppBrowser() });

export const trackSignupSubmitted = (loggedIn: boolean) =>
  umami.track("mobile_app_signup_submitted", {
    logged_in: loggedIn,
    in_app_browser: inAppBrowser(),
  });

export const trackSignupSucceeded = (loggedIn: boolean, utmContent: string | null) =>
  umami.track("mobile_app_signup_succeeded", {
    logged_in: loggedIn,
    in_app_browser: inAppBrowser(),
    utm_content: utmContent ?? "none",
  });

export const trackSignupFailed = (reason: "invalid_email" | "server") =>
  umami.track("mobile_app_signup_failed", { reason });

export const trackFeatureAnswered = (feature: string) =>
  umami.track("mobile_app_feature_answered", { feature });
