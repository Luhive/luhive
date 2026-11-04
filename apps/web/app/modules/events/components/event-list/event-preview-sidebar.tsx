import { useNavigate, Form, useNavigation, useFetcher } from "react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { hasHackathonQuestions } from "~/modules/events/model/hackathon-team";
import { buildEventUrl, copyEventLink } from "~/modules/events/utils/copy-event-link";
import {
  Calendar,
  MapPin,
  Copy,
  ExternalLink,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/shared/components/ui/avatar";
import { Button } from "~/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/shared/components/ui/sheet";
import type { Community, Event, Profile } from "~/shared/models/entity.types";
import type {
  CustomQuestionJson,
  ExternalPlatform,
} from "~/modules/events/model/event.types";
import {
  getExternalPlatformName,
  getExternalPlatformIcon,
} from "~/modules/events/utils/external-platform";
import { Badge } from "~/shared/components/ui/badge";
import AttendersAvatars from "~/modules/events/components/attenders/attenders-avatars";
import HostedBy from "~/modules/events/components/shared/hosted-by";
import { EventRsvpModal } from "../registration/event-rsvp-modal";
import { CustomQuestionsForm } from "../registration/custom-questions-form";
import { createClient } from "~/shared/lib/supabase/client";
import {
  getEventTrackingContext,
  shouldTrackEventVisit,
} from "~/modules/events/utils/event-session-tracker";
import { EventLocationMapSection } from "~/modules/events/components/shared/event-location-map-section";
import { toLocationValue } from "~/modules/events/utils/event-location";
import { GoogleMaps } from "~/modules/events/utils/google-maps";
import { getEventPriceLabel } from "~/modules/events/utils/event-price-label";

dayjs.extend(utc);
dayjs.extend(timezone);

type SubmissionIntent = "register" | "unregister";

interface EventPreviewSidebarProps {
  event: Event | null;
  community: Community | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToEvent?: () => void;
  registrationCount?: number;
  user?: { id: string; email?: string | null } | null;
  userProfile?: Profile | null;
  isUserRegistered?: boolean;
}

export function EventPreviewSidebar({
  event,
  community,
  open,
  onOpenChange,
  onNavigateToEvent,
  registrationCount,
  user,
  userProfile,
  isUserRegistered = false,
}: EventPreviewSidebarProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [showCustomQuestionsForm, setShowCustomQuestionsForm] = useState(false);
  const [localIsRegistered, setLocalIsRegistered] = useState(isUserRegistered);
  const [hostingCommunities, setHostingCommunities] = useState<Array<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    role: "host" | "co-host";
  }>>([]);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const lastSubmittedIntentRef = useRef<SubmissionIntent | null>(null);
  const prevEventIdRef = useRef<string | null>(null);
  const trackingContext = useMemo(
    () => (event?.id ? getEventTrackingContext(event.id) : undefined),
    [event?.id],
  );

  // Sync local state with prop when it changes
  useEffect(() => {
    setLocalIsRegistered(isUserRegistered);
  }, [isUserRegistered]);

  // Reset transient registration state only when switching between different events
  useEffect(() => {
    const currentEventId = event?.id ?? null;

    if (
      prevEventIdRef.current !== null &&
      currentEventId !== null &&
      prevEventIdRef.current !== currentEventId
    ) {
      setLocalIsRegistered(false);
      lastSubmittedIntentRef.current = null;
      setShowRsvpModal(false);
      setShowCustomQuestionsForm(false);
    }

    prevEventIdRef.current = currentEventId;
  }, [event?.id]);

  // Fetch hosting communities when sidebar opens
  useEffect(() => {
    if (!open || !event || !community) {
      return;
    }

    const currentEvent = event;
    const currentCommunity = community;

    async function fetchHostingCommunities() {
      try {
        const supabase = createClient();
        
        // First get the actual host community from the event
        const { data: hostCommunityData, error: hostError } = await supabase
          .from("communities")
          .select("id, name, slug, logo_url")
          .eq("id", currentEvent.community_id)
          .single();

        if (hostError || !hostCommunityData) {
          console.error("Error fetching host community:", hostError);
          // Fall back to just the community
          setHostingCommunities([{
            id: currentCommunity.id,
            name: currentCommunity.name,
            slug: currentCommunity.slug,
            logo_url: currentCommunity.logo_url,
            role: "host",
          }]);
          return;
        }

        // Then get all collaborations
        const { data: collaborations, error } = await supabase
          .from("event_collaborations")
          .select(`
            *,
            community:communities!event_collaborations_community_id_fkey (
              id,
              name,
              slug,
              logo_url
            )
          `)
          .eq("event_id", currentEvent.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching collaborations:", error);
          // Fall back to just the host community
          setHostingCommunities([{
            id: hostCommunityData.id,
            name: hostCommunityData.name,
            slug: hostCommunityData.slug,
            logo_url: hostCommunityData.logo_url,
            role: "host",
          }]);
          return;
        }

        const hosts: Array<{
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          role: "host" | "co-host";
        }> = [];

        // Add host community first (always show host)
        hosts.push({
          id: hostCommunityData.id,
          name: hostCommunityData.name,
          slug: hostCommunityData.slug,
          logo_url: hostCommunityData.logo_url,
          role: "host",
        });

        // Add all accepted co-hosts (including current community if it's a co-host)
        if (collaborations) {
          for (const collab of collaborations) {
            if (collab.role === "co-host" && collab.status === "accepted") {
              const coHostCommunity = Array.isArray(collab.community)
                ? collab.community[0]
                : collab.community;
              if (coHostCommunity && coHostCommunity.id !== hostCommunityData.id) {
                hosts.push({
                  id: coHostCommunity.id,
                  name: coHostCommunity.name,
                  slug: coHostCommunity.slug,
                  logo_url: coHostCommunity.logo_url,
                  role: "co-host",
                });
              }
            }
          }
        }

        setHostingCommunities(hosts);
      } catch (error) {
        console.error("Error fetching hosting communities:", error);
        // Fall back to just the community
        setHostingCommunities([{
          id: currentCommunity.id,
          name: currentCommunity.name,
          slug: currentCommunity.slug,
          logo_url: currentCommunity.logo_url,
          role: "host",
        }]);
      }
    }

    fetchHostingCommunities();
  }, [open, event?.id, event?.community_id, community?.id]);

  // Check registration status client-side when sidebar opens or event/user changes
  useEffect(() => {
    // Only check if sidebar is open, user is available, and event is available
    if (!open || !user || !event) {
      return;
    }
    const eventId = event.id;
    const userId = user.id;

    async function checkRegistrationStatus() {
      try {
        const supabase = createClient();
        const { data: registration } = await supabase
          .from("event_registrations")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", userId)
          .maybeSingle();

        setLocalIsRegistered(!!registration);
      } catch (error) {
        console.error("Error checking registration status:", error);
        // Don't update state on error, keep current state
      }
    }

    checkRegistrationStatus();
  }, [open, user?.id, event?.id]);

  useEffect(() => {
    if (!open || !event || !community || !trackingContext) {
      return;
    }

    if (!shouldTrackEventVisit(event.id)) {
      return;
    }

    let cancelled = false;
    (async () => {
      let geo: {
        ip: string;
        country: string | null;
        city: string | null;
        region: string | null;
        timezone: string | null;
      } | null = null;

      try {
        const geoKey = "luhive_public_geo_v1";
        const cached = window.sessionStorage.getItem(geoKey);
        if (cached) {
          const parsed = JSON.parse(cached) as any;
          if (typeof parsed?.ip === "string" && parsed.ip) {
            geo = {
              ip: parsed.ip,
              country: typeof parsed.country === "string" ? parsed.country : null,
              city: typeof parsed.city === "string" ? parsed.city : null,
              region: typeof parsed.region === "string" ? parsed.region : null,
              timezone: typeof parsed.timezone === "string" ? parsed.timezone : null,
            };
          }
        }

        if (!geo) {
          const ipKey = "luhive_public_ip";
          let ip = window.sessionStorage.getItem(ipKey);
          if (!ip) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1200);
            const res = await fetch("https://api.ipify.org?format=json", {
              method: "GET",
              signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.ok) {
              const data = (await res.json()) as { ip?: string };
              ip = typeof data.ip === "string" ? data.ip : null;
              if (ip) window.sessionStorage.setItem(ipKey, ip);
            }
          }

          if (ip) {
            async function tryFetchJson(url: string): Promise<any | null> {
              try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 1500);
                const res = await fetch(url, { method: "GET", signal: controller.signal });
                clearTimeout(timeout);
                if (!res.ok) return null;
                return await res.json();
              } catch {
                return null;
              }
            }

            const ipWho = await tryFetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
            const ipApiCo = ipWho
              ? null
              : await tryFetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);

            geo = {
              ip,
              country:
                typeof ipWho?.country === "string"
                  ? ipWho.country
                  : typeof ipApiCo?.country_name === "string"
                    ? ipApiCo.country_name
                    : null,
              city:
                typeof ipWho?.city === "string"
                  ? ipWho.city
                  : typeof ipApiCo?.city === "string"
                    ? ipApiCo.city
                    : null,
              region:
                typeof ipWho?.region === "string"
                  ? ipWho.region
                  : typeof ipApiCo?.region === "string"
                    ? ipApiCo.region
                    : null,
              timezone:
                typeof ipWho?.timezone?.id === "string"
                  ? ipWho.timezone.id
                  : typeof ipApiCo?.timezone === "string"
                    ? ipApiCo.timezone
                    : null,
            };

            if (geo) window.sessionStorage.setItem(geoKey, JSON.stringify(geo));
          }
        }
      } catch {
        geo = null;
      }

      if (cancelled) return;

      const formData = new FormData();
      formData.append("intent", "track_visit");
      formData.append("eventId", event.id);
      formData.append("communityId", community.id);
      formData.append("sessionId", trackingContext.sessionId);
      formData.append("utmSource", trackingContext.utmSource);
      if (geo?.ip) formData.append("clientIp", geo.ip);
      if (geo?.country) formData.append("clientCountry", geo.country);
      if (geo?.city) formData.append("clientCity", geo.city);
      if (geo?.region) formData.append("clientRegion", geo.region);
      if (geo?.timezone) formData.append("clientTimezone", geo.timezone);
      if (trackingContext.utmMedium) formData.append("utmMedium", trackingContext.utmMedium);
      if (trackingContext.utmCampaign) formData.append("utmCampaign", trackingContext.utmCampaign);
      if (trackingContext.utmContent) formData.append("utmContent", trackingContext.utmContent);
      if (trackingContext.utmTerm) formData.append("utmTerm", trackingContext.utmTerm);
      if (trackingContext.referrerUrl) formData.append("referrerUrl", trackingContext.referrerUrl);
      if (trackingContext.referrerDomain) formData.append("referrerDomain", trackingContext.referrerDomain);

      fetch(Routes.community.event(community.slug, publicEventSlug(event)), {
        method: "POST",
        body: formData,
      }).catch((error) => {
        console.error("Failed to track event preview visit:", error);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    event,
    community,
    trackingContext,
  ]);

  // Check if current user is owner/admin of the community (for Manage CTA)
  useEffect(() => {
    if (!open || !user || !community) return;

    let mounted = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: membership } = await supabase
          .from("community_members")
          .select("role")
          .eq("community_id", community.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) return;
        setIsOwnerOrAdmin(
          !!membership && (membership.role === "owner" || membership.role === "admin")
        );
      } catch (err) {
        console.error("Error checking community membership:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, user?.id, community?.id]);

  // Monitor fetcher data for successful registration
  useEffect(() => {
    if (fetcher.data) {
      const lastSubmittedIntent = lastSubmittedIntentRef.current;

      if (fetcher.data.success) {
        if (lastSubmittedIntent === "unregister") {
          setLocalIsRegistered(false);
        } else {
          setLocalIsRegistered(true);
          setShowCustomQuestionsForm(false);
          if (fetcher.data.message) {
            toast.success(fetcher.data.message);
          } else {
            toast.success("Successfully registered for the event!");
          }
        }
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error);
      }

      lastSubmittedIntentRef.current = null;
    }
  }, [fetcher.data]);

  const isSubmitting =
    fetcher.state === "submitting" || fetcher.state === "loading";
  const currentSubmittingIntent = fetcher.formData?.get("intent");
  const isRegistering =
    isSubmitting && currentSubmittingIntent === "register";
  const isUnregistering =
    isSubmitting && currentSubmittingIntent === "unregister";

  if (!event || !community) return null;

  const eventDate = dayjs(event.start_time).tz(event.timezone);
  const eventEndDate = event.end_time
    ? dayjs(event.end_time).tz(event.timezone)
    : null;
  const isPastEvent = eventDate.isBefore(dayjs());

  // Check if this is an external event
  const isExternalEvent = event.registration_type === "external";
  const platform = event.external_platform as ExternalPlatform | null;
  const PlatformIcon = platform ? getExternalPlatformIcon(platform) : null;

  // Check if event has custom questions
  const hasCustomQuestions =
    event.custom_questions &&
    ((event.custom_questions as any)?.phone?.enabled ||
      ((event.custom_questions as any)?.custom &&
        (event.custom_questions as any).custom.length > 0));

  // Get user phone from profile metadata
  const userPhone =
    userProfile?.metadata &&
    typeof userProfile.metadata === "object" &&
    "phone" in userProfile.metadata
      ? (userProfile.metadata as any).phone
      : null;

  const eventUrl = buildEventUrl(community.slug, event);

  const handleCopyLink = () => {
    copyEventLink(community.slug, event);
  };

  const handleNavigateToEvent = () => {
    // Close sidebar first
    onOpenChange(false);

    // Trigger the navigation callback if provided (for instant overlay)
    if (onNavigateToEvent) {
      onNavigateToEvent();
    }

    // Navigate to the event page with event data in state
    navigate(Routes.community.event(community.slug, publicEventSlug(event)), {
      state: { event },
    });
  };

  const handleOpenEventPageInNewTab = () => {
    onOpenChange(false);
    window.open(eventUrl, "_blank", "noopener,noreferrer");
  };

  const handleRegisterClick = () => {
    // For past events, navigate to event page
    if (isPastEvent) {
      handleNavigateToEvent();
      return;
    }

    // For link events, open external URL directly
    if (isExternalEvent) {
      if (event.external_registration_url) {
        window.open(
          event.external_registration_url,
          "_blank",
          "noopener,noreferrer",
        );
      } else {
        handleNavigateToEvent();
      }
      return;
    }

    // Hackathons ask "start or join a team" first, which only the register page does.
    if (hasHackathonQuestions(event.custom_questions as CustomQuestionJson | null)) {
      navigate(Routes.community.eventRegister(community.slug, publicEventSlug(event)));
      return;
    }

    // For regular events
    if (user) {
      // Logged-in user: check if custom questions are needed
      if (hasCustomQuestions) {
        setShowCustomQuestionsForm(true);
      }
      // If no custom questions, the form will be rendered below and submitted directly
    } else {
      // Not logged in: show RSVP modal (OTP flow)
      setShowRsvpModal(true);
    }
  };

  const handleCustomQuestionsSubmit = (answers: Record<string, unknown>) => {
    lastSubmittedIntentRef.current = "register";

    const formData = new FormData();
    formData.append("intent", "register");
    formData.append("custom_answers", JSON.stringify(answers));
    if (trackingContext?.sessionId) formData.append("eventSessionId", trackingContext.sessionId);
    if (trackingContext?.utmSource) formData.append("eventUtmSource", trackingContext.utmSource);
    if (trackingContext?.utmMedium) formData.append("eventUtmMedium", trackingContext.utmMedium);
    if (trackingContext?.utmCampaign) formData.append("eventUtmCampaign", trackingContext.utmCampaign);
    if (trackingContext?.utmContent) formData.append("eventUtmContent", trackingContext.utmContent);
    if (trackingContext?.utmTerm) formData.append("eventUtmTerm", trackingContext.utmTerm);
    if (trackingContext?.firstVisitStartedAt) formData.append("eventFirstVisitStartedAt", trackingContext.firstVisitStartedAt);

    fetcher.submit(formData, {
      method: "POST",
      action: Routes.community.event(community.slug, publicEventSlug(event)),
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden [&>button]:hidden"
        >
          {/* Header with action buttons */}
          <SheetHeader className="shrink-0 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Close sidebar</span>
              </Button>

              <div className="flex-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEventPageInNewTab}
                className="gap-1.5"
              >
                Event Page
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>

              {isOwnerOrAdmin && (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a
                    href={`/dashboard/${community.slug}/events/${event.id}/statistics`}
                  >
                    Insight
                    <BarChart3 className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
            <SheetTitle className="sr-only">{event.title}</SheetTitle>
          </SheetHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto event-sidebar-scrollbar">
            {/* Event Cover - 300x300px */}
            <div className="p-4 pb-0">
              <div className="relative h-[300px] w-[300px] m-auto rounded-xl overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-background">
                {event.cover_url ? (
                  <img
                    src={event.cover_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <Calendar className="h-16 w-16 text-primary/30" />
                  </div>
                )}

                {/* Past Event Overlay */}
                {isPastEvent && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Badge
                      variant="outline"
                      className="bg-black/60 text-white border-white/20"
                    >
                      Past Event
                    </Badge>
                  </div>
                )}

                {/* External badge overlay on cover */}
                {isExternalEvent && (
                  <div className="absolute bottom-3 right-3">
                    <Badge
                      variant="outline"
                      className="bg-background/90 border-primary/50 text-primary"
                    >
                      {PlatformIcon ? (
                        <PlatformIcon className="w-3 h-3 mr-1" />
                      ) : (
                        <ExternalLink className="w-3 h-3 mr-1" />
                      )}
                      {platform
                        ? getExternalPlatformName(platform)
                        : "External"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Event Details */}
            <div className="p-4 space-y-3">
              {/* Title */}
              <h2 className="text-xl font-bold leading-tight">{event.title}</h2>

              {/* Date & Location - Side by side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Date Card */}
                <div className="rounded-lg bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Date
                    </span>
                  </div>
                  <p className="text-sm font-semibold">
                    {eventDate.format("MMM D, YYYY")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {eventDate.format("h:mm A")}
                    {eventEndDate && ` - ${eventEndDate.format("h:mm A")}`}
                  </p>
                </div>

                {/* Location Card */}
                <div className="rounded-lg bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Location
                    </span>
                  </div>
                  {event.location_address ? (
                    (() => {
                      const location = toLocationValue(event);
                      const venueName =
                        location?.name ||
                        event.location_name ||
                        event.location_address.split(",")[0];
                      const mapsHref = location
                        ? GoogleMaps.mapsLink(location)
                        : GoogleMaps.mapsSearchUrl({
                            name: event.location_name,
                            address: event.location_address,
                            placeId: event.location_place_id,
                          });

                      return (
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block min-w-0 group"
                        >
                          <p className="text-sm font-semibold truncate flex items-center gap-1 group-hover:underline">
                            {venueName}
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {event.location_address}
                          </p>
                        </a>
                      );
                    })()
                  ) : (
                    <>
                      <p className="text-sm font-semibold">
                        {event.event_type === "online" ? "Online Event" : "TBA"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.event_type === "online"
                          ? "Virtual attendance"
                          : "Location pending"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Hosted by & Attenders - Side by side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Hosted by */}
                <div className="rounded-lg bg-card p-3">
                  <HostedBy
                    hosts={hostingCommunities}
                    fallbackCommunity={community}
                  />
                </div>

                {/* Attenders */}
                <div className="rounded-lg bg-card p-3 ">
                  <span className="text-xs text-muted-foreground font-medium block mb-2">
                    Attending
                  </span>
                  <AttendersAvatars
                    eventId={event.id}
                    maxVisible={3}
                    isExternalEvent={isExternalEvent}
                    canViewList={
                      isExternalEvent || localIsRegistered || isOwnerOrAdmin
                    }
                  />
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="rounded-lg bg-card px-3">
                  <h3 className="text-xs text-muted-foreground font-medium mb-2">
                    About
                  </h3>
                  <p className="text-sm whitespace-pre-wrap text-foregroundEventPreviewSidebar">
                    {event.description}
                  </p>
                </div>
              )}

              <EventLocationMapSection
                event={event}
                mapHeight={200}
                headingClassName="text-base font-semibold"
              />
            </div>
          </div>

          {/* Footer CTA with price */}
          <div className="shrink-0 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-4">
              <div className="shrink-0">
                <p className="text-lg font-bold">{getEventPriceLabel(event)}</p>
              </div>
              {isOwnerOrAdmin ? (
                <Button asChild className="w-[20rem]" size="lg">
                  <a href={`/dashboard/${community.slug}/events`}>
                    Manage Event
                  </a>
                </Button>
              ) : isPastEvent ? (
                <Button
                  onClick={handleNavigateToEvent}
                  className="w-[20rem]"
                  size="lg"
                >
                  View Event Details
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              ) : isExternalEvent ? (
                <Button
                  onClick={handleRegisterClick}
                  className="w-[20rem]"
                  size="lg"
                >
                  Go to event
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              ) : user ? (
                // Logged-in user: show registration form
                localIsRegistered ? (
                  <fetcher.Form
                    method="post"
                    action={Routes.community.event(
                      community.slug,
                      publicEventSlug(event),
                    )}
                    onSubmit={() => {
                      lastSubmittedIntentRef.current = "unregister";
                    }}
                  >
                    <input type="hidden" name="intent" value="unregister" />
                    <Button
                      type="submit"
                      className="w-[20rem]"
                      size="lg"
                      variant="outline"
                      disabled={isSubmitting}
                    >
                      {isUnregistering ? "Unregistering..." : "Unregister"}
                    </Button>
                  </fetcher.Form>
                ) : hasCustomQuestions ? (
                  // Show button that opens custom questions form
                  <Button
                    onClick={handleRegisterClick}
                    className="w-[15rem]"
                    size="default"
                    disabled={isRegistering}
                  >
                    {isRegistering ? "Registering..." : "Register"}
                  </Button>
                ) : (
                  <fetcher.Form
                    method="post"
                    action={Routes.community.event(
                      community.slug,
                      publicEventSlug(event),
                    )}
                    onSubmit={() => {
                      lastSubmittedIntentRef.current = "register";
                    }}
                  >
                    <input type="hidden" name="intent" value="register" />
                    <input
                      type="hidden"
                      name="eventSessionId"
                      value={trackingContext?.sessionId ?? ""}
                    />
                    <input
                      type="hidden"
                      name="eventUtmSource"
                      value={trackingContext?.utmSource ?? "direct"}
                    />
                    <input
                      type="hidden"
                      name="eventUtmMedium"
                      value={trackingContext?.utmMedium ?? ""}
                    />
                    <input
                      type="hidden"
                      name="eventUtmCampaign"
                      value={trackingContext?.utmCampaign ?? ""}
                    />
                    <input
                      type="hidden"
                      name="eventUtmContent"
                      value={trackingContext?.utmContent ?? ""}
                    />
                    <input
                      type="hidden"
                      name="eventUtmTerm"
                      value={trackingContext?.utmTerm ?? ""}
                    />
                    <input
                      type="hidden"
                      name="eventFirstVisitStartedAt"
                      value={trackingContext?.firstVisitStartedAt ?? ""}
                    />
                    <Button
                      type="submit"
                      className="w-[20rem]"
                      size="lg"
                      disabled={isRegistering}
                    >
                      {isRegistering ? "Registering..." : "Register"}
                    </Button>
                  </fetcher.Form>
                )
              ) : (
                // Not logged in: show register button that opens dialog
                <Button
                  onClick={handleRegisterClick}
                  className="w-[20rem]"
                  size="lg"
                  disabled={isRegistering}
                >
                  {isRegistering ? "Processing..." : "Register"}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Registration Dialogs */}
      <EventRsvpModal
        open={showRsvpModal}
        onOpenChange={setShowRsvpModal}
        eventId={event.id}
        eventSlug={publicEventSlug(event)}
        communitySlug={community.slug}
        communityId={community.id}
        communityName={community.name}
        hasCustomQuestions={!!hasCustomQuestions}
        customQuestions={(event.custom_questions as CustomQuestionJson) ?? null}
        userPhone={userPhone ?? undefined}
        trackingContext={trackingContext}
      />
      {hasCustomQuestions && (
        <CustomQuestionsForm
          open={showCustomQuestionsForm}
          onOpenChange={setShowCustomQuestionsForm}
          eventId={event.id}
          customQuestions={event.custom_questions as any}
          userName={userProfile?.full_name || undefined}
          userEmail={user?.email || undefined}
          userAvatarUrl={userProfile?.avatar_url || undefined}
          userPhone={userPhone}
          onSubmit={handleCustomQuestionsSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}

export default EventPreviewSidebar;
