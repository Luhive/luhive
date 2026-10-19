export { loader } from "~/modules/community/server/community-home-loader.server";

import {
  useLoaderData,
  useRouteLoaderData,
  Link,
  useNavigation,
  useRevalidator,
  useLocation,
} from "react-router";
import { createClient as createClientBrowser } from "~/shared/lib/supabase/client";
import { Routes } from "~/shared/lib/routing/routes";
import type { Database } from "~/shared/models/database.types";
import { useEffect, useState, Suspense, lazy } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/ui/avatar";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/shared/components/ui/card";
import { Badge } from "~/shared/components/ui/badge";
import { Spinner } from "~/shared/components/ui/spinner";
import {
  Instagram,
  Linkedin,
  MessageCircle,
  Calendar,
  Users,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  BadgeCheck,
  Heart,
  Globe,
  Link2,
  Megaphone,
  Plus,
  Eye,
} from "lucide-react";
import { Activity } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "~/shared/components/ui/tooltip";
import {
  getSessionId,
  shouldTrackVisit,
  isFirstVisit,
  shouldTrackAnnouncementView,
} from "~/modules/community/utils/session-tracker";
import { JoinCommunityForm } from "~/modules/community/components/join-community-form";
import { CoverPictureUpload } from "~/modules/community/components/cover-picture-upload";
import { EventListSkeleton } from "~/modules/events/components/event-list/event-list";
import { EventPageSkeleton } from "~/modules/events/components/event-list/event-page-skeleton";
import { EventPreviewSidebar } from "~/modules/events/components/event-list/event-preview-sidebar";
import { useIsMobile } from "~/shared/hooks/use-mobile";
import { toast } from "sonner";
import type { CommunityHomeLoaderData } from "~/modules/community/server/community-home-loader.server";
import type { CommunityLayoutLoaderData } from "~/modules/community/server/community-layout-loader.server";
import type { CommunityAnnouncement } from "~/modules/community/server/community-home-loader.server";
import type { Community } from "~/modules/community/model/community-types";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogImage,
  MorphingDialogSubtitle,
  MorphingDialogDescription,
  MorphingDialogDate,
  MorphingDialogViewCount,
  MorphingDialogClose,
  MorphingDialogContainer,
} from "~/shared/components/core/morphing-dialog";
import { ScrollArea } from "~/shared/components/ui/scroll-area";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Announcement = CommunityAnnouncement;


const EventList = lazy(() =>
  import("~/modules/events/components/event-list/event-list").then((module) => ({
    default: module.EventList,
  }))
);

export default function CommunityIndexPage() {
  const homeData = useLoaderData<CommunityHomeLoaderData>();
  const layoutData = useRouteLoaderData(
    "routes/web/community-layout",
  ) as CommunityLayoutLoaderData | undefined;
  const loaderData = {
    community: null,
    isOwner: false,
    isMember: false,
    user: null,
    profile: null,
    ...layoutData,
    ...homeData,
  };
  const navigation = useNavigation();
  const location = useLocation();
  const revalidator = useRevalidator();
  const isMobile = useIsMobile();

  const navigationState = location.state as {
    community?: Community & {
      memberCount?: number;
      eventCount?: number;
      description?: string;
      verified?: boolean;
    };
    description?: string;
    verified?: boolean;
  } | null;

  const stateCommunity = navigationState?.community;
  const isNavigating = navigation.state === "loading";
  const isNavigatingFromHub = isNavigating && !!stateCommunity;

  const skeletonCommunity = stateCommunity
    ? {
      ...stateCommunity,
      description:
        stateCommunity.description ||
        navigationState?.description ||
        undefined,
      verified: stateCommunity.verified ?? navigationState?.verified ?? false,
    }
    : null;

  const {
    community,
    isOwner,
    isMember,
    user,
    profile,
    analytics,
    memberCount,
    eventCount,
    announcements: loaderAnnouncements,
  } = loaderData;

  useEffect(() => {
    if (!community?.id) return;
    if (shouldTrackVisit(community.id)) {
      const sessionId = getSessionId();
      const firstVisit = isFirstVisit();
      const fullAnalytics = { ...analytics, isFirstVisit: firstVisit };
      const formData = new FormData();
      formData.append("intent", "track_visit");
      formData.append("communityId", community.id);
      formData.append("sessionId", sessionId);
      formData.append("analytics", JSON.stringify(fullAnalytics));
      fetch(location.pathname, { method: "POST", body: formData });
    }
  }, [community?.id, analytics, location.pathname]);

  const isDashboardLoading =
    navigation.state === "loading" &&
    navigation.location?.pathname.includes("/dashboard/");

  const isEventsLoading =
    navigation.state === "loading" &&
    navigation.location?.pathname?.endsWith("/events");

  const displayName = community?.name || "You Community Name";
  const displayTagline = community?.tagline || "Community Tagline";
  const displayDescription =
    community?.description || "Community Description";
  const displayLogo = community?.logo_url || "";
  const displayCover = community?.cover_url || "";
  const displayVerified = community?.verified || false;
  const shouldShowDescriptionToggle = displayDescription.length > 160;
  const formattedMemberCount =
    memberCount >= 1000 ? `${(memberCount / 1000).toFixed(1)}K` : `${memberCount}`;
  const formattedEventCount =
    eventCount >= 1000 ? `${(eventCount / 1000).toFixed(1)}K` : `${eventCount}`;

  const socialLinks = community?.social_links as {
    website?: string;
    instagram?: string;
    linkedin?: string;
    whatsapp?: string;
    discord?: string;
  } | null;

  const showStickyButton = !isMember && !isOwner;
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventSidebarOpen, setIsEventSidebarOpen] = useState(false);
  const [eventRegistrationCount, setEventRegistrationCount] = useState<
    number | undefined
  >(undefined);
  const [pendingEvent, setPendingEvent] = useState<Event | null>(null);
  const [loadedEvents, setLoadedEvents] = useState<Event[]>([]);
  const [announcementItems, setAnnouncementItems] = useState<Announcement[]>(
    loaderAnnouncements,
  );
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  useEffect(() => {
    setAnnouncementItems(loaderAnnouncements);
    setSelectedAnnouncement((current) => {
      if (!current) {
        return null;
      }

      return (
        loaderAnnouncements.find((announcement) => announcement.id === current.id) ||
        current
      );
    });
  }, [loaderAnnouncements]);

  useEffect(() => {
    if (navigation.state === "idle") {
      setPendingEvent(null);
    }
  }, [navigation.state]);

  useEffect(() => {
    if (!selectedEvent?.id) {
      setEventRegistrationCount(undefined);
      return;
    }
    const eventId = selectedEvent.id;
    async function fetchRegistrationCount() {
      try {
        const supabase = createClientBrowser();
        const { count } = await supabase
          .from("event_registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId)
          .eq("approval_status", "approved");
        setEventRegistrationCount(count || 0);
      } catch (error) {
        console.error("Error fetching registration count:", error);
        setEventRegistrationCount(undefined);
      }
    }
    fetchRegistrationCount();
  }, [selectedEvent?.id]);

  // Track announcement views
  useEffect(() => {
    if (!selectedAnnouncement?.id) {
      return;
    }

    const selectedAnnouncementId = selectedAnnouncement.id;

    if (!shouldTrackAnnouncementView(selectedAnnouncementId)) {
      return;
    }

    async function trackView() {
      try {
        const sessionId = getSessionId();
        const response = await fetch("/api/announcements/track-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            announcementId: selectedAnnouncementId,
            sessionId,
          }),
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          console.error("Failed to track announcement view");
          return;
        }

        if (typeof result?.viewCount === "number") {
          setAnnouncementItems((current) =>
            current.map((announcement) =>
              announcement.id === selectedAnnouncementId
                ? { ...announcement, viewCount: result.viewCount }
                : announcement,
            ),
          );

          setSelectedAnnouncement((current) =>
            current?.id === selectedAnnouncementId
              ? { ...current, viewCount: result.viewCount }
              : current,
          );
        }
      } catch (error) {
        console.error("Error tracking announcement view:", error);
      }
    }

    trackView();
  }, [selectedAnnouncement?.id]);

  useEffect(() => {
    if (location.search.includes("published")) {
      window.history.replaceState({}, "", location.pathname);
    }
  }, [location.search, location.pathname]);

  return (
    <>
        {pendingEvent && community && (
          <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
            <div className="min-h-screen container mx-auto px-4 sm:px-8">
              <EventPageSkeleton event={pendingEvent} community={community} />
            </div>
          </div>
        )}

        {/* {isDashboardLoading && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Loading Dashboard...
            </p>
          </div>
        </div>
      )} */}

        <Activity mode={isOwner ? "visible" : "hidden"}>
          <div className="fixed bottom-4 right-4 z-50 md:bottom-auto md:top-[88px]">
            <div className="flex flex-col gap-2">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="group h-10 w-10 rounded-md shadow-sm hover:shadow-md transition-all duration-200 bg-background border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                      aria-label="Community Dashboard"
                      asChild
                    >
                      <Link
                        to={`/dashboard/${community?.slug || "luhive"}`}
                        prefetch="intent"
                      >
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="bg-popover rounded-md border border-border mr-1 shadow-lg"
                  >
                    <div className="flex items-center gap-2 px-3 py-1">
                      <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          Dashboard
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </Activity>

        <main className={`lg:py-8 py-4 ${isMobile ? "pb-18" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto md:auto-rows-[minmax(120px,auto)]">
            <Card className="md:col-span-2 py-0 lg:col-span-2 lg:row-span-2 border hover:border-primary/30 transition-colors shadow-none overflow-hidden">
              <CardContent className="p-0 flex flex-col h-full">
                {isOwner && community ? (
                  <CoverPictureUpload
                    communitySlug={community.slug}
                    currentCoverUrl={displayCover}
                    onCoverUpdate={() => revalidator.revalidate()}
                  />
                ) : (
                  <div className="relative w-full aspect-[4/1] max-h-32 sm:max-h-36 md:max-h-40 lg:max-h-44 bg-gradient-to-br from-muted/20 via-muted-foreground/10 to-background">
                    {displayCover ? (
                      <img
                        src={displayCover}
                        alt={`${displayName} cover`}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                )}

                <div className="pb-4 flex flex-col items-center justify-center text-center flex-1 space-y-4 -mt-10 sm:-mt-12">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={displayLogo} alt={displayName} />
                    <AvatarFallback className="text-xl sm:text-2xl bg-primary/10 text-primary">
                      {displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 px-4">
                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                      {displayName}
                    </h1>
                    <p className="text-base sm:text-lg text-primary font-medium">
                      {displayTagline}
                    </p>
                    <p
                      className={`text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md md:mx-auto ${!isDescriptionExpanded ? "line-clamp-3" : ""}`}
                    >
                      {displayDescription}
                    </p>
                    {shouldShowDescriptionToggle && (
                      <button
                        type="button"
                        onClick={() =>
                          setIsDescriptionExpanded((prev) => !prev)
                        }
                        className="text-xs sm:text-sm text-primary font-medium hover:text-primary/80 transition-colors"
                      >
                        {isDescriptionExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 border-primary/30 text-primary px-3 py-1.5"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      First Adopter
                    </Badge>
                    {displayVerified && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-emerald-400/40 text-emerald-600 dark:text-emerald-400 px-3 py-1.5"
                      >
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified by Luhive
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-center gap-2 flex-wrap pt-2">
                    <Activity
                      mode={socialLinks?.website ? "visible" : "hidden"}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 bg-pop rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                              aria-label="Website"
                              onClick={() =>
                                window.open(
                                  socialLinks?.website,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                            >
                              <Globe className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="bg-popover border text-popover-foreground"
                          >
                            <p className="text-xs">{socialLinks?.website}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Activity>
                    <Activity
                      mode={socialLinks?.instagram ? "visible" : "hidden"}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                              aria-label="Instagram"
                              onClick={() =>
                                window.open(
                                  socialLinks?.instagram,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                            >
                              <Instagram className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="bg-popover border text-popover-foreground"
                          >
                            <p className="text-xs">{socialLinks?.instagram}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Activity>
                    <Activity
                      mode={socialLinks?.linkedin ? "visible" : "hidden"}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                              aria-label="LinkedIn"
                              onClick={() =>
                                window.open(
                                  socialLinks?.linkedin,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                            >
                              <Linkedin className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="bg-popover border text-popover-foreground"
                          >
                            <p className="text-xs">{socialLinks?.linkedin}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Activity>
                    <Activity
                      mode={socialLinks?.whatsapp ? "visible" : "hidden"}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                              aria-label="WhatsApp"
                              onClick={() =>
                                window.open(
                                  socialLinks?.whatsapp,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="bg-popover border text-popover-foreground"
                          >
                            <p className="text-xs">{socialLinks?.whatsapp}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Activity>
                    <Activity
                      mode={socialLinks?.discord ? "visible" : "hidden"}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                              aria-label="Discord"
                              onClick={() =>
                                window.open(
                                  socialLinks?.discord,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                            >
                              <img src="/discord-logo.svg" alt="" className="h-4 w-4 grayscale" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="bg-popover border text-popover-foreground"
                          >
                            <p className="text-xs">{socialLinks?.discord}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Activity>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="col-span-1 grid grid-cols-2 gap-4 md:contents">
              <Card className="h-20 md:h-auto border hover:border-primary/30 transition-colors shadow-none">
                <CardContent className="p-3 md:p-6 flex flex-row md:flex-col items-center justify-center h-full text-center gap-2 md:gap-2">
                  <Users className="h-8 w-8 md:h-10 md:w-10 text-primary shrink-0" />
                  <div className="flex items-center gap-2 md:flex-col md:items-center md:gap-0">
                    <p className="text-2xl md:text-3xl font-bold text-foreground leading-none">
                      {formattedMemberCount}
                    </p>
                    <p className="text-sm md:text-sm text-muted-foreground">
                      members
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="h-20 md:h-auto border hover:border-primary/30 shadow-none">
                <CardContent className="p-3 md:p-6 flex flex-row md:flex-col items-center justify-center h-full text-center gap-2 md:gap-2">
                  <Calendar className="h-8 w-8 md:h-10 md:w-10 text-primary shrink-0" />
                  <div className="flex items-center gap-2 md:flex-col md:items-center md:gap-0">
                    <p className="text-2xl md:text-3xl font-bold text-foreground leading-none">
                      {formattedEventCount}
                    </p>
                    <p className="text-sm md:text-sm text-muted-foreground">
                      events
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="hidden md:col-span-2 md:block lg:col-span-2 lg:row-span-1 border hover:border-primary/30 transition-colors shadow-none">
              <CardHeader className="pb-2 lg:pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <Sparkles className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 lg:gap-4">
                {isOwner ? (
                  <Button
                    className="w-full py-5.5 lg:py-6 rounded-sm hover:bg-muted text-sm hover:shadow-xs font-medium border-foreground/20 border-solid border bg-background"
                    asChild
                  >
                    <Link to={`/dashboard/${community?.slug}`}>
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4 opacity-90 text-foreground" />
                          <span className="text-foreground">
                            Manage Your Community
                          </span>
                        </span>
                      </span>
                    </Link>
                  </Button>
                ) : (
                  <JoinCommunityForm
                    communityId={community?.id || ""}
                    communityName={displayName}
                    userEmail={user?.email}
                    isLoggedIn={!!user}
                    isMember={isMember}
                  />
                )}
                <Button className="w-full py-5.5 lg:py-6 rounded-sm hover:bg-muted text-sm hover:shadow-xs font-medium border-foreground/20 border-solid border bg-background">
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 opacity-90 text-foreground" />
                      <span className="text-foreground">Give a Feedback</span>
                    </span>
                  </span>
                </Button>
                <Button
                  className="w-full py-5.5 lg:py-6 rounded-sm hover:bg-muted text-sm hover:shadow-xs font-medium border-foreground/20 border-solid border bg-background"
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied to clipboard!");
                  }}
                >
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 opacity-90 text-foreground" />
                      <span className="text-foreground">Copy Public Link</span>
                    </span>
                  </span>
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3 lg:row-span-2 border hover:border-primary/30 transition-colors shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                    <Calendar className="h-5 w-5" />
                    Upcoming Events
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {community && (
                      isEventsLoading ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Spinner className="h-3.5 w-3.5" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <Link
                          to={Routes.community.events(community.slug)}
                          prefetch="intent"
                          state={{ community, events: loadedEvents }}
                          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          View All
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )
                    )}
                    {isOwner && community && loadedEvents.length > 0 && (
                      <Button
                        asChild
                        size="icon"
                        className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        title="Create event"
                      >
                        <Link to={`/dashboard/${community.slug}/events/create`}>
                          <Plus className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {community ? (
                  <Suspense fallback={<EventListSkeleton />}>
                    <EventList
                      communityId={community.id}
                      communitySlug={community.slug}
                      limit={3}
                      isOwner={isOwner}
                      onEventClick={(event) => {
                        setSelectedEvent(event);
                        setIsEventSidebarOpen(true);
                      }}
                      onEventsLoaded={(events) => setLoadedEvents(events)}
                    />
                  </Suspense>
                ) : (
                  <EventListSkeleton />
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:row-span-2 lg:col-span-1 border hover:border-primary/30 transition-colors shadow-none relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                    <Megaphone className="h-5 w-5" />
                    Announcements
                  </CardTitle>
                  {isOwner && announcementItems.length > 0 && (
                    <Link
                      to={Routes.community.announcementNew(community?.slug ?? "")}
                      prefetch="render"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      title="Add announcement"
                    >
                      <Plus className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="min-h-[300px]">
                {announcementItems.length === 0 ? (
                  <div className="h-full min-h-[250px] flex flex-col items-center justify-center space-y-4">
                    <div className="flex flex-col items-center space-y-2">
                      <Megaphone className="h-10 w-10 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-muted-foreground text-center">
                        No announcements yet
                      </p>
                      <p className="text-xs text-muted-foreground/70 text-center max-w-xs">
                        Keep your community informed with updates and
                        announcements
                      </p>
                    </div>
                    {isOwner && (
                      <Link
                        to={Routes.community.announcementNew(community?.slug ?? "")}
                        prefetch="render"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Add Announcement
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[320px] space-y-4 pr-1">
                    {announcementItems.map((announcement) => (
                      <MorphingDialog
                        key={announcement.id}
                        open={selectedAnnouncement?.id === announcement.id}
                        onOpenChange={(open) => {
                          setSelectedAnnouncement(open ? announcement : null);
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 24,
                        }}
                      >
                        <MorphingDialogTrigger
                          style={{ borderRadius: "16px" }}
                          className="border border-border bg-background hover:border-primary/50 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 p-3">
                            {announcement.images?.[0]?.image_url ? (
                              <MorphingDialogImage
                                src={announcement.images[0].image_url}
                                alt={announcement.title}
                                className="h-14 w-14 shrink-0 object-cover object-center"
                                style={{ borderRadius: "10px" }}
                              />
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-muted text-primary">
                                <Megaphone className="h-5 w-5" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-1">
                              <MorphingDialogTitle className="line-clamp-1 text-sm font-semibold text-foreground">
                                {announcement.title}
                              </MorphingDialogTitle>
                              
                              <MorphingDialogDescription className="line-clamp-2 text-xs text-muted-foreground">
                                {announcement.description}
                              </MorphingDialogDescription>
                            </div>

                            <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
                              <MorphingDialogDate className="whitespace-nowrap text-xs font-medium text-primary">
                                {new Date(announcement.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </MorphingDialogDate>
                              <MorphingDialogViewCount className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Eye className="h-3.5 w-3.5" />
                                <span>{announcement.viewCount || 0}</span>
                              </MorphingDialogViewCount>
                            </div>
                          </div>
                        </MorphingDialogTrigger>

                        <MorphingDialogContainer>
                          <MorphingDialogContent
                            style={{ borderRadius: isMobile ? "24px 24px 0 0" : "24px" }}
                            className="relative h-auto w-full border border-border bg-background shadow-2xl sm:max-w-[680px]"
                          >
                            <div className="h-[88vh] sm:h-[90vh] overflow-y-auto custom-scroll-design">
                              <div className="relative p-5 sm:p-6">
                                <div className="flex justify-center pb-6  sm:pb-8 ">
                                  {announcement.images?.[0]?.image_url ? (
                                    <MorphingDialogImage
                                      src={announcement.images[0].image_url}
                                      alt={announcement.title}
                                      className="h-[15rem] md:h-[19rem] w-full object-cover object-[20%_70%] md:object-[20%_60%] rounded-[9.45px]"
                                      style={{ borderRadius: "9.45px" }}
                                    />
                                  ) : (
                                    <div className="flex h-[220px] w-full max-w-[320px] items-center justify-center rounded-[18px] bg-muted text-primary">
                                      <Megaphone className="h-10 w-10" />
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <div>
                                    <MorphingDialogTitle className="text-2xl font-bold leading-tight text-foreground sm:text-[34px] sm:leading-[1.2]">
                                      {announcement.title}
                                    </MorphingDialogTitle>
                                  </div>

                                  <div className="flex items-center justify-between gap-4 pb-4">
                                    <div className="flex min-w-0 items-center gap-2">
                                      {displayLogo ? (
                                        <img
                                          src={displayLogo}
                                          alt={displayName}
                                          className="h-[2.6rem] w-[2.6rem] rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="h-9 w-9 rounded-full bg-primary/10" />
                                      )}
                                      <span className="truncate font-semibold text-[15px] leading-[1.5] tracking-normal align-middle text-foreground">
                                        {displayName}
                                      </span>
                                    </div>

                                    <div className="text-right text-muted-foreground flex flex-col items-end gap-1">
                                      <MorphingDialogDate
                                        dateTime={announcement.created_at}
                                        className="font-medium text-[12px] leading-[1.5] tracking-normal align-middle"
                                      >
                                        {new Date(announcement.created_at).toLocaleDateString(
                                          "en-US",
                                          {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          },
                                        )}
                                      </MorphingDialogDate>

                                      <MorphingDialogViewCount className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>{announcement.viewCount || 0}</span>
                                      </MorphingDialogViewCount>
                                    </div>
                                  </div>

                                  <MorphingDialogDescription className="pb-6 text-sm leading-7 whitespace-pre-wrap text-muted-foreground sm:text-[15px]">
                                    {announcement.description}
                                  </MorphingDialogDescription>
                                </div>
                              </div>
                            </div>

                            {/* <MorphingDialogClose className="text-muted-foreground" /> */}
                          </MorphingDialogContent>
                        </MorphingDialogContainer>
                      </MorphingDialog>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        <EventPreviewSidebar
          event={selectedEvent}
          community={community}
          open={isEventSidebarOpen}
          onOpenChange={(open) => {
            setIsEventSidebarOpen(open);
            if (!open) {
              setSelectedEvent(null);
              setEventRegistrationCount(undefined);
            }
          }}
          onNavigateToEvent={() => {
            if (selectedEvent) {
              setPendingEvent(selectedEvent);
            }
          }}
          registrationCount={eventRegistrationCount}
          user={user ? { id: user.id, email: user.email } : null}
          userProfile={user ? profile : null}
          isUserRegistered={false}
        />

        {isMobile && community && showStickyButton && (
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-background/0 pointer-events-none transition-opacity duration-300 ease-in-out ${showStickyButton ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <div
              className={`pointer-events-auto max-w-md mx-auto transform transition-all duration-300 ease-in-out ${showStickyButton ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            >
              <JoinCommunityForm
                communityId={community.id}
                communityName={displayName}
                userEmail={user?.email}
                isLoggedIn={!!user}
                isMember={isMember}
                trigger={
                  <Button className="w-full py-6 rounded-xl shadow-lg hover:shadow-xl text-base font-semibold transition-all duration-200 bg-primary hover:bg-primary/90">
                    <span className="flex items-center justify-center gap-2">
                      <Users className="h-5 w-5" />
                      <span>Join Community</span>
                    </span>
                  </Button>
                }
              />
            </div>
          </div>
        )}
    </>
  );
}
