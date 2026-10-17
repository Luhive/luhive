import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import { redirect } from "react-router";
import type { DehydratedState } from "@tanstack/react-query";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { LoaderFunctionArgs } from "react-router";
import type { ExternalPlatform } from "~/modules/events/model/event.types";
import type { EventPageUserState } from "~/modules/events/model/event-detail-view.types";
import { Community, Event, Profile } from "~/shared/models/entity.types";
import { getEventCollaborations } from "~/modules/events/data/collaborations-repo.server";
import { findPendingTicketPayment } from "~/modules/events/server/payments/find-pending-ticket-payment.server";
import type { PendingTicketPayment } from "~/modules/events/model/ticket-order.types";
import { resolvePublicEvent } from "~/modules/events/server/resolve-public-event.server";
import { Routes } from "~/shared/lib/routing/routes";
import { isUuid } from "~/modules/events/utils/event-slug";
import { dehydrateSeed } from "~/shared/lib/query/dehydrate-loader.server";
import { eventRegistrationKey } from "~/shared/lib/query/query-keys";
import {
  logLoaderTiming,
  timedLoader,
} from "~/shared/lib/diagnostics/loader-timing.server";

dayjs.extend(timezone);

const PROFILE_EVENT_DETAIL_COLUMNS = "id, full_name, avatar_url, metadata";

const EXTERNAL_PLATFORM_NAMES: Record<ExternalPlatform, string> = {
  google_forms: "Google Forms",
  microsoft_forms: "Microsoft Forms",
  luma: "Luma",
  eventbrite: "Eventbrite",
  other: "External Form",
};

export interface UserData {
  registrationCount: number;
  isUserRegistered: boolean;
  userRegistrationStatus: string | null;
  userCheckinToken: string | null;
  canRegister: boolean;
  user: { id: string; email?: string | null } | null;
  userProfile: Profile | null;
  isOwnerOrAdmin: boolean;
  isCommunityMember: boolean;
  pendingTicketPayment: PendingTicketPayment | null;
}

export interface EventDetailLoaderData {
  event: Event;
  community: Community;
  origin: string;
  userData: UserData;
  dehydratedState: DehydratedState;
  isPastEvent: boolean;
  capacityPercentage: number;
  hasCustomQuestions: boolean;
  userPhone: string | null;
  isExternalEvent: boolean;
  externalPlatformName: string;
  registrationDeadlineFormatted: string;
  hostingCommunities: Array<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    role: "host" | "co-host";
    isMember: boolean;
    settings: Community["settings"];
    social_links: Community["social_links"];
  }>;
}

export async function loader({
  request,
  params,
  context,
}: LoaderFunctionArgs): Promise<EventDetailLoaderData> {
  const loaderStartedAt = performance.now();
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);

  const communitySlug = (params as { slug?: string }).slug;
  const eventSlug = (params as { eventSlug?: string }).eventSlug;

  if (!communitySlug || !eventSlug) {
    throw new Response("Not Found", { status: 404 });
  }

  const resolved = await timedLoader(
    "eventDetail resolvePublicEvent",
    resolvePublicEvent(supabase, communitySlug, eventSlug, {
      publishedOnly: true,
    }),
  );

  if (!resolved) {
    throw new Response("Event not found", { status: 404 });
  }

  const { event, community } = resolved;

  if (isUuid(eventSlug) && event.slug) {
    throw redirect(Routes.community.event(communitySlug, event.slug), 301);
  }

  const url = new URL(request.url);
  const origin = url.origin;

  const serviceClient = createServiceRoleClient();
  const isHostCommunityPath = event.community_id === community.id;

  const [
    { count: regCount },
    u,
    { collaborations },
    hostCommunityResult,
  ] = await Promise.all([
    timedLoader(
      "eventDetail registration count",
      serviceClient
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("is_verified", true)
        .eq("rsvp_status", "going")
        .eq("approval_status", "approved"),
    ),
    timedLoader("eventDetail auth getUser", findAuthUser()),
    timedLoader("eventDetail collaborations", getEventCollaborations(supabase, event.id)),
    isHostCommunityPath
      ? Promise.resolve({
          data: {
            id: community.id,
            name: community.name,
            slug: community.slug,
            logo_url: community.logo_url,
            settings: community.settings,
            social_links: community.social_links,
          },
          error: null,
        })
      : supabase
          .from("communities")
          .select("id, name, slug, logo_url, settings, social_links")
          .eq("id", event.community_id)
          .single(),
  ]);

  const { data: hostCommunity, error: hostCommunityError } = hostCommunityResult;

  let isUserRegistered = false;
  let userRegistrationStatus: string | null = null;
  let userCheckinToken: string | null = null;
  let isOwnerOrAdmin = false;
  let isCommunityMember = false;
  let userProfile: Profile | null = null;
  let pendingTicketPayment: PendingTicketPayment | null = null;

  if (u) {
    const registrationQuery =
      event.registration_type !== "external"
        ? supabase
            .from("event_registrations")
            .select("id, approval_status, checkin_token")
            .eq("event_id", event.id)
            .eq("user_id", u.id)
            .single()
        : Promise.resolve({ data: null });

    const [{ data: registration }, { data: membership }, { data: profile }] =
      await Promise.all([
        registrationQuery,
        supabase
          .from("community_members")
          .select("role")
          .eq("community_id", community.id)
          .eq("user_id", u.id)
          .single(),
        supabase
          .from("profiles")
          .select(PROFILE_EVENT_DETAIL_COLUMNS)
          .eq("id", u.id)
          .single(),
      ]);

    if (event.registration_type !== "external") {
      isUserRegistered = !!registration;
      userRegistrationStatus = registration?.approval_status || null;
      userCheckinToken = registration?.checkin_token || null;

      if (registration?.approval_status === "pending") {
        pendingTicketPayment = await findPendingTicketPayment(registration.id);
      }
    }

    isOwnerOrAdmin =
      membership?.role === "owner" || membership?.role === "admin";
    isCommunityMember = !!membership;
    userProfile = (profile as Profile | null) || null;
  }

  if (hostCommunityError || !hostCommunity) {
    throw new Response("Host community not found", { status: 404 });
  }

  const now = new Date();
  const eventStartTime = new Date(event.start_time);
  const registrationDeadline = event.registration_deadline
    ? new Date(event.registration_deadline)
    : eventStartTime;

  const canRegister =
    event.status === "published" &&
    now < registrationDeadline &&
    (!event.capacity || (regCount || 0) < event.capacity);

  const userData: UserData = {
    registrationCount: regCount || 0,
    isUserRegistered,
    userRegistrationStatus,
    userCheckinToken,
    canRegister,
    user: u || null,
    userProfile,
    isOwnerOrAdmin,
    isCommunityMember,
    pendingTicketPayment,
  };

  const pageUserState: EventPageUserState = {
    isUserRegistered: userData.isUserRegistered,
    userRegistrationStatus: userData.userRegistrationStatus,
    userCheckinToken: userData.userCheckinToken,
    registrationCount: userData.registrationCount,
    user: userData.user,
    userProfile: userData.userProfile,
    isCommunityMember: userData.isCommunityMember,
    canRegister: userData.isUserRegistered
      ? false
      : userData.canRegister,
    pendingTicketPayment: userData.pendingTicketPayment,
  };

  const dehydratedState = await dehydrateSeed((queryClient) => {
    queryClient.setQueryData(
      eventRegistrationKey(event.id),
      pageUserState,
    );
  });

  const regCountNum = regCount || 0;
  const isPastEvent = eventStartTime < now;
  const capacityPercentage = event.capacity
    ? Math.round((regCountNum / event.capacity) * 100)
    : 0;

  const cq = event.custom_questions as {
    phone?: { enabled?: boolean };
    custom?: unknown[];
  } | null;
  const hasCustomQuestions = Boolean(
    cq && (cq.phone?.enabled || (cq.custom?.length ?? 0) > 0),
  );

  const userPhone =
    userProfile?.metadata &&
    typeof userProfile.metadata === "object" &&
    "phone" in userProfile.metadata
      ? ((userProfile.metadata as { phone?: string }).phone ?? null)
      : null;

  const isExternalEvent = event.registration_type === "external";
  const externalPlatformName =
    isExternalEvent && event.external_platform
      ? (EXTERNAL_PLATFORM_NAMES[event.external_platform as ExternalPlatform] ??
        "External Form")
      : "External Form";

  const tz = event.timezone ?? "UTC";
  const registrationDeadlineFormatted = (
    event.registration_deadline
      ? dayjs(event.registration_deadline).tz(tz)
      : dayjs(event.start_time).tz(tz)
  ).format("h:mm A z");

  let hostingCommunities: Array<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    role: "host" | "co-host";
    isMember: boolean;
    settings: Community["settings"];
    social_links: Community["social_links"];
  }> = [];

  hostingCommunities.push({
    id: hostCommunity.id,
    name: hostCommunity.name,
    slug: hostCommunity.slug,
    logo_url: hostCommunity.logo_url,
    role: "host",
    isMember: false,
    settings: hostCommunity.settings ?? null,
    social_links: hostCommunity.social_links ?? null,
  });

  for (const collab of collaborations) {
    if (collab.role === "co-host" && collab.status === "accepted") {
      const coHostCommunity = Array.isArray(collab.community)
        ? collab.community[0]
        : collab.community;
      if (coHostCommunity && coHostCommunity.id !== hostCommunity.id) {
        hostingCommunities.push({
          id: coHostCommunity.id,
          name: coHostCommunity.name,
          slug: coHostCommunity.slug,
          logo_url: coHostCommunity.logo_url,
          role: "co-host",
          isMember: false,
          settings: coHostCommunity.settings ?? null,
          social_links: coHostCommunity.social_links ?? null,
        });
      }
    }
  }

  if (u && hostingCommunities.length > 0) {
    const { data: memberships } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", u.id)
      .in("community_id", hostingCommunities.map((h) => h.id));

    const memberIds = new Set(memberships?.map((m) => m.community_id) ?? []);
    hostingCommunities = hostingCommunities.map((h) => ({
      ...h,
      isMember: memberIds.has(h.id),
    }));
  }

  logLoaderTiming("eventDetail loader total", loaderStartedAt);
  return {
    event,
    community,
    origin,
    userData,
    dehydratedState,
    isPastEvent,
    capacityPercentage,
    hasCustomQuestions,
    userPhone,
    isExternalEvent,
    externalPlatformName,
    registrationDeadlineFormatted,
    hostingCommunities,
  };
}
