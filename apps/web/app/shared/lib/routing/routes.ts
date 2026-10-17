/**
 * Centralized route definitions — single source of truth for every URL path.
 *
 * Grouped by domain so call sites can discover routes via autocomplete:
 *   Routes.community.detail(slug)
 *   Routes.dashboard.eventEdit(slug, eventId)
 *   Routes.api.events.checkIn
 *
 * Migration: to flatten the community URL scheme (drop the "/c" prefix),
 * change COMMUNITY_BASE only — every call site updates automatically.
 */

const COMMUNITY_BASE = "/c";
const DASHBOARD_BASE = "/dashboard";
const AUTH_BASE = "/auth";
const API_BASE = "/api";

export class Routes {
  static home = "/";
  static hub = "/hub";
  static hubLegacy = "/hub-legacy";
  static profile = "/profile";
  static login = "/login";
  static signup = "/signup";
  static logout = "/logout";
  static privacyPolicy = "/privacy-policy";
  static termsOfService = "/terms-of-service";
  static unsubscribe = "/unsubscribe";
  static createCommunity = "/create-community";
  static createCommunitySuccess = "/create-community/success";

  static auth = {
    emailSentVerify: `${AUTH_BASE}/email-sent/verify`,
    emailSentReset: `${AUTH_BASE}/email-sent/reset`,
    verify: `${AUTH_BASE}/verify`,
    verifyOtp: `${AUTH_BASE}/verify-otp`,
    forgotPassword: `${AUTH_BASE}/forgot-password`,
    resetPassword: `${AUTH_BASE}/verify/reset-password`,
  };

  static community = {
    /** Raw prefix — use for pathname.startsWith() checks only, not for linking. */
    base: COMMUNITY_BASE,
    detail: (slug: string) => `${COMMUNITY_BASE}/${slug}`,
    announcementNew: (slug: string) =>
      `${COMMUNITY_BASE}/${slug}/announcements/new`,
    announcement: (slug: string, id: string) =>
      `${COMMUNITY_BASE}/${slug}/announcements/${id}`,
    events: (slug: string) => `${COMMUNITY_BASE}/${slug}/events`,
    event: (communitySlug: string, eventSlug: string) =>
      `${COMMUNITY_BASE}/${communitySlug}/${eventSlug}`,
    eventRegister: (communitySlug: string, eventSlug: string) =>
      `${COMMUNITY_BASE}/${communitySlug}/${eventSlug}/register`,
    eventInviteAccept: (communitySlug: string, eventSlug: string) =>
      `${COMMUNITY_BASE}/${communitySlug}/${eventSlug}/invite/accept`,
    eventCollaboration: (communitySlug: string, eventSlug: string) =>
      `${COMMUNITY_BASE}/${communitySlug}/${eventSlug}/collaboration`,
    collaborationInvite: (slug: string, collaborationId: string) =>
      `${COMMUNITY_BASE}/${slug}/collaboration-invite/${collaborationId}`,
    /** True when pathname is a nested route under /c/:slug (not the community index). */
    isCommunityChildPath: (communitySlug: string, pathname: string) => {
      const base = `${COMMUNITY_BASE}/${communitySlug}`;
      return pathname !== base && pathname.startsWith(`${base}/`);
    },
  };

  static dashboard = {
    /** Raw prefix — use for pathname.startsWith() checks only, not for linking. */
    base: DASHBOARD_BASE,
    overview: (slug: string) => `${DASHBOARD_BASE}/${slug}`,
    profile: (slug: string) => `${DASHBOARD_BASE}/${slug}/profile`,
    events: (slug: string) => `${DASHBOARD_BASE}/${slug}/events`,
    collabRequests: (slug: string) =>
      `${DASHBOARD_BASE}/${slug}/collab-requests`,
    announcements: (slug: string) =>
      `${DASHBOARD_BASE}/${slug}/announcements`,
    announcementNew: (slug: string) =>
      `${DASHBOARD_BASE}/${slug}/announcements/new`,
    announcementEdit: (slug: string, id: string) =>
      `${DASHBOARD_BASE}/${slug}/announcements/${id}/edit`,
    eventCreate: (slug: string) => `${DASHBOARD_BASE}/${slug}/events/create`,
    eventCreateExternal: (slug: string) =>
      `${DASHBOARD_BASE}/${slug}/events/create-external`,
    eventEdit: (slug: string, eventId: string) =>
      `${DASHBOARD_BASE}/${slug}/events/${eventId}/edit`,
    eventEditExternal: (slug: string, eventId: string) =>
      `${DASHBOARD_BASE}/${slug}/events/${eventId}/edit-external`,
    eventStatistics: (slug: string, eventId: string) =>
      `${DASHBOARD_BASE}/${slug}/events/${eventId}/statistics`,
    eventScanner: (slug: string, eventId: string) =>
      `${DASHBOARD_BASE}/${slug}/events/${eventId}/scanner`,
    attenders: (slug: string) => `${DASHBOARD_BASE}/${slug}/attenders`,
    forms: (slug: string) => `${DASHBOARD_BASE}/${slug}/forms`,
    form: (slug: string, formId: string) =>
      `${DASHBOARD_BASE}/${slug}/forms/${formId}`,
    settings: (slug: string) => `${DASHBOARD_BASE}/${slug}/settings`,
  };

  static og = {
    event: (communitySlug: string, eventSlug: string) =>
      `${API_BASE}/og/event/${communitySlug}/${eventSlug}`,
  };

  static api = {
    events: {
      attendersEmails: `${API_BASE}/events/attenders-emails`,
      attendersList: `${API_BASE}/events/attenders-list`,
      invite: `${API_BASE}/events/invite`,
      updateRegistrationStatus: `${API_BASE}/events/update-registration-status`,
      scheduleUpdate: `${API_BASE}/events/schedule-update`,
      sendReminders: `${API_BASE}/events/send-reminders`,
      newEventNotification: `${API_BASE}/events/new-event-notification`,
      collaborationNotification: `${API_BASE}/events/collaboration-notification`,
      registrationConfirmation: `${API_BASE}/events/registration-confirmation`,
      checkIn: `${API_BASE}/events/check-in`,
    },
    hub: {
      eventPreview: (eventId: string) => `${API_BASE}/hub/events/${eventId}/preview`,
    },
    community: {
      join: `${API_BASE}/join-community`,
      updateMemberRole: `${API_BASE}/community/update-member-role`,
    },
    announcements: {
      newNotification: `${API_BASE}/announcements/new-announcement-notification`,
      trackView: `${API_BASE}/announcements/track-view`,
      trackEmailOpen: `${API_BASE}/announcements/track-email-open`,
    },
    googleForms: {
      auth: `${API_BASE}/integrations/google-forms/auth`,
      callback: `${API_BASE}/integrations/google-forms/callback`,
      status: `${API_BASE}/integrations/google-forms/status`,
      list: `${API_BASE}/integrations/google-forms/list`,
      disconnect: `${API_BASE}/integrations/google-forms/disconnect`,
      form: (formId: string) =>
        `${API_BASE}/integrations/google-forms/${formId}`,
      responses: (formId: string) =>
        `${API_BASE}/integrations/google-forms/${formId}/responses`,
    },
  };

  /** Build an absolute URL for emails, canonical tags, OG tags, sitemap. */
  static absolute = (origin: string, path: string) =>
    `${origin.replace(/\/$/, "")}${path}`;
}
