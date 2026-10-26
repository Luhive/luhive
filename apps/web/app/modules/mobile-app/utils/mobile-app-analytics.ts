import { umamiAnalytics as analytics } from "~/shared/lib/analytics/analytics";
import { isInAppBrowser } from "~/shared/lib/is-in-app-browser";

// Umami only: this page's events never go to GA4 (docs/mobile-app-waitlist.md §7).

function inAppBrowser(): boolean {
  return typeof navigator !== "undefined" && isInAppBrowser(navigator.userAgent);
}

export const trackEmailFocused = () =>
  analytics.track("mobile_app_email_focused", { in_app_browser: inAppBrowser() });

export const trackSignupSubmitted = (loggedIn: boolean) =>
  analytics.track("mobile_app_signup_submitted", {
    logged_in: loggedIn,
    in_app_browser: inAppBrowser(),
  });

export const trackSignupSucceeded = (loggedIn: boolean, utmContent: string | null) =>
  analytics.track("mobile_app_signup_succeeded", {
    logged_in: loggedIn,
    in_app_browser: inAppBrowser(),
    utm_content: utmContent ?? "none",
  });

export const trackSignupFailed = (reason: "invalid_email" | "server") =>
  analytics.track("mobile_app_signup_failed", { reason });

export const trackFeatureAnswered = (feature: string) =>
  analytics.track("mobile_app_feature_answered", { feature });
