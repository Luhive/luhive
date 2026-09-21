import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // Landing page (standalone, no navigation layout)
  index("routes/web/index.tsx"),

  // Routes with top navigation layout
  layout("routes/web/layout.tsx", [
    route("hub", "routes/web/hub.tsx"),
    route("profile", "routes/web/profile.tsx"),
    route("c/:slug", "routes/web/community-layout.tsx", [
      index("routes/web/community-index.tsx"),
      route("announcements/new", "routes/web/announcement-new.tsx"),
      route(
        "announcements/:announcementId",
        "routes/web/announcement-detail.tsx",
      ),
      route("events", "routes/web/events-layout.tsx", [
        index("routes/web/events-index.tsx"),
      ]),
      route("events/:eventId", "routes/web/event-legacy-redirect.tsx"),
      route(
        "events/:eventId/collaboration",
        "routes/web/event-collaboration-legacy-redirect.tsx",
      ),
      route(":eventSlug/collaboration", "routes/web/event-collaboration.tsx"),
      route(":eventSlug", "routes/web/event-detail.tsx", [
        route("register", "routes/web/event-register.tsx"),
      ]),
      route(
        ":eventSlug/invite/accept",
        "routes/web/event-invite-accept.tsx",
      ),
    ]),
    route(
      "c/:slug/collaboration-invite/:collaborationId",
      "routes/web/collaboration-invite.tsx",
    ),
    route("create-community", "routes/web/create-community.tsx"),
    route(
      "create-community/success",
      "routes/web/create-community-success.tsx",
    ),

    // route("c/:slug/events/:eventId/verify", "routes/web/event-verify.tsx"),
    // route(
    //   "c/:slug/events/:eventId/verification-sent",
    //   "routes/web/event-verification-sent.tsx",
    // ),
  ]),

  route("login", "routes/auth/login.tsx"),
  route("signup", "routes/auth/register.tsx"),

  route("privacy-policy", "routes/web/privacy-policy.tsx"),
  route("terms-of-service", "routes/web/terms-conditions.tsx"),
  route("unsubscribe", "routes/web/unsubscribe.tsx"),

  // Dashboard: parent route owns :slug, children are relative
  route("dashboard/:slug", "routes/dashboard/layout.tsx", [
    index("routes/dashboard/overview.tsx"),
    route("profile", "routes/dashboard/edit-profile.tsx"),
    route("events", "routes/dashboard/events.tsx"),
    route("collab-requests", "routes/dashboard/collab-requests.tsx"),
    route("announcements", "routes/dashboard/announcements.tsx"),
    route("announcements/new", "routes/dashboard/announcements-new.tsx"),
    route(
      "announcements/:announcementId/edit",
      "routes/dashboard/announcements-edit.tsx",
    ),
    route("events/:eventId/edit", "routes/dashboard/event-edit.tsx"),
    route("events/create", "routes/dashboard/events-create.tsx"),
    route(
      "events/create-external",
      "routes/dashboard/events-create-external.tsx",
    ),
    route(
      "events/:eventId/edit-external",
      "routes/dashboard/event-edit-external.tsx",
    ),
    route(
      "events/:eventId/statistics",
      "routes/dashboard/event-statistics.tsx",
    ),
    route("events/:eventId/scanner", "routes/dashboard/event-scanner.tsx"),
    route("attenders", "routes/dashboard/attenders.tsx"),
    route("forms", "routes/dashboard/forms.tsx"),
    route("forms/:formId", "routes/dashboard/forms-detail.tsx"),
    route("settings", "routes/dashboard/settings.tsx"),
  ]),

  route("logout", "routes/auth/logout.tsx"),

  route("auth/email-sent/verify", "routes/auth/verify-email-sent.tsx"),
  route("auth/email-sent/reset", "routes/auth/reset-password-email-sent.tsx"),

  route("auth/verify", "routes/auth/verify.tsx"),
  route("auth/verify-otp", "routes/auth/verify-otp.tsx"),
  route("auth/forgot-password", "routes/auth/forgot-password.tsx"),
  route("auth/verify/reset-password", "routes/auth/verify-reset-password.tsx"),

  // OG image generation
  route("api/og/event/:slug/:eventSlug", "routes/api/og/event.tsx"),

  // Events API routes
  route("api/events/create", "routes/api/events/create.tsx"),
  route("api/events/update", "routes/api/events/update.tsx"),
  route(
    "api/events/attenders-emails",
    "routes/api/events/attenders-emails.tsx",
  ),
  route("api/events/attenders-list", "routes/api/events/attenders-list.tsx"),
  route("api/events/invite", "routes/api/events/invite.tsx"),
  route("api/current-user", "routes/api/current-user.tsx"),
  // TEMPORARY — remove with routes/api/core-health.tsx when #8 lands
  route("api/core-health", "routes/api/core-health.tsx"),
  route("api/events/registration-state", "routes/api/events/registration-state.tsx"),
  route("api/events/event-statistics", "routes/api/events/event-statistics.tsx"),
  route(
    "api/events/update-registration-status",
    "routes/api/events/update-registration-status.tsx",
  ),
  route("api/events/schedule-update", "routes/api/events/schedule-update.tsx"),
  route("api/events/send-reminders", "routes/api/events/send-reminders.tsx"),
  route("api/join-community", "routes/api/join-community.tsx"),
  route(
    "api/community/update-member-role",
    "routes/api/community/update-member-role.tsx",
  ),
  route(
    "api/events/new-event-notification",
    "routes/api/events/new-event-notification.tsx",
  ),
  route(
    "api/events/collaboration-notification",
    "routes/api/events/collaboration-notification.tsx",
  ),
  route(
    "api/events/registration-confirmation",
    "routes/api/events/registration-confirmation.tsx",
  ),
  route("api/events/check-in", "routes/api/events/check-in.tsx"),
  route(
    "api/announcements/new-announcement-notification",
    "routes/api/announcements/new-announcement-notification.tsx",
  ),
  route(
    "api/announcements/track-view",
    "routes/api/announcements/track-view.tsx",
  ),
  route(
    "api/announcements/track-email-open",
    "routes/api/announcements/track-email-open.tsx",
  ),

  // Integrations API routes (Google Forms)
  route(
    "api/integrations/google-forms/auth",
    "routes/api/integrations/google-forms/auth.tsx",
  ),
  route(
    "api/integrations/google-forms/callback",
    "routes/api/integrations/google-forms/callback.tsx",
  ),
  route(
    "api/integrations/google-forms/status",
    "routes/api/integrations/google-forms/status.tsx",
  ),
  route(
    "api/integrations/google-forms/list",
    "routes/api/integrations/google-forms/list.tsx",
  ),
  route(
    "api/integrations/google-forms/disconnect",
    "routes/api/integrations/google-forms/disconnect.tsx",
  ),
  route(
    "api/integrations/google-forms/:formId",
    "routes/api/integrations/google-forms/form-id.tsx",
  ),
  route(
    "api/integrations/google-forms/:formId/responses",
    "routes/api/integrations/google-forms/form-id-responses.tsx",
  ),
] satisfies RouteConfig;
