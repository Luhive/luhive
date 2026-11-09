import { Activity, useEffect, useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Calendar, MapPin, Video, ExternalLink, BarChart3, Ticket } from "lucide-react";
import { Button } from "~/shared/components/ui/button";
import { Separator } from "~/shared/components/ui/separator";
import type { Community, Event } from "~/shared/models/entity.types";
import type { TimeRemaining } from "~/modules/events/model/event-detail-view.types";
import type { UserData } from "~/modules/events/server/event-detail-loader.server";
import type { ExternalPlatform } from "~/modules/events/model/event.types";
import type { EventTrackingContext } from "~/modules/events/utils/event-session-tracker";
import type { HackathonViewer } from "~/modules/events/model/hackathon-team";
import { EventRegistrationCard } from "./event-registration-card";
import { EventAttendeesAvatars } from "./event-attendees-avatars";
import { EventLocationMapSection } from "~/modules/events/components/shared/event-location-map-section";
import {
  toLocationValue,
  deriveLocality,
} from "~/modules/events/utils/event-location";
import { GoogleMaps } from "~/modules/events/utils/google-maps";
import {
  getEventPriceLabel,
  isPaidEvent,
} from "~/modules/events/utils/event-price-label";

dayjs.extend(utc);
dayjs.extend(timezone);

interface EventInfoSectionProps {
  event: Event;
  community: Community;
  userData: UserData;
  timeRemaining: TimeRemaining | null;
  registrationDeadlineFormatted: string;
  hasCustomQuestions: boolean;
  isPastEvent: boolean;
  isExternalEvent: boolean;
  externalPlatform: ExternalPlatform | null;
  externalPlatformName: string;
  isRegistering: boolean;
  isUnregistering: boolean;
  eventTrackingContext: EventTrackingContext;
  highlightRegistrationCard?: boolean;
  isRegisterOpen?: boolean;
  hackathon?: HackathonViewer | null;
}

export function EventInfoSection({
  event,
  community,
  userData,
  timeRemaining,
  registrationDeadlineFormatted,
  hasCustomQuestions,
  isPastEvent,
  isExternalEvent,
  externalPlatform,
  externalPlatformName,
  isRegistering,
  isUnregistering,
  eventTrackingContext,
  highlightRegistrationCard = false,
  isRegisterOpen = false,
  hackathon = null,
}: EventInfoSectionProps) {
  const { isUserRegistered, isOwnerOrAdmin } = userData;
  const registrationCardRef = useRef<HTMLDivElement>(null);
  const tz = event.timezone ?? "UTC";
  const eventDate = dayjs(event.start_time).tz(tz);
  const eventEndDate = event.end_time ? dayjs(event.end_time).tz(tz) : null;
  const location = toLocationValue(event);

  useEffect(() => {
    if (!highlightRegistrationCard || !isUserRegistered || isRegisterOpen)
      return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const scrollToCard = () => {
      registrationCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    };

    let retryTimeoutId: number | undefined;

    const timeoutId = window.setTimeout(() => {
      scrollToCard();

      retryTimeoutId = window.setTimeout(() => {
        if (window.scrollY < 80) {
          scrollToCard();
        }
      }, 200);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      if (retryTimeoutId !== undefined) {
        window.clearTimeout(retryTimeoutId);
      }
    };
  }, [highlightRegistrationCard, isUserRegistered, isRegisterOpen]);

  return (
    <div className="contents lg:block lg:space-y-6">
      <div className="order-2 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h1 className="min-w-0 text-2xl md:text-4xl font-bold leading-tight">
            {event.title}
          </h1>
          {/* Insight button — hidden for now
          <Activity mode={isOwnerOrAdmin ? "visible" : "hidden"}>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
            >
              <a
                href={`/dashboard/${community.slug}/events/${event.id}/statistics`}
              >
                Insight
                <BarChart3 className="h-4 w-4" />
              </a>
            </Button>
          </Activity>
          */}
        </div>
      </div>

      <div className="order-4 min-w-0 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-base">
              {eventDate.format("dddd, MMMM D")}
            </p>
            <p className="text-sm text-muted-foreground">
              {eventDate.format("h:mm A")}
              {eventEndDate &&
                ` - ${
                  eventEndDate.isSame(eventDate, "day")
                    ? eventEndDate.format("h:mm A")
                    : eventEndDate.format("ddd, MMM D, h:mm A")
                }`}{" "}
              {event.timezone}
            </p>
          </div>
        </div>

        {/* Compact location line — Luma-style, directly under date */}
        <Activity mode={event.location_address ? "visible" : "hidden"}>
          {(() => {
            const venueName =
              location?.name || event.location_address?.split(",")[0] || "";
            const city = deriveLocality(event.location_address);
            const href = location
              ? GoogleMaps.mapsLink(location)
              : GoogleMaps.mapsSearchUrl({ address: event.location_address });
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 group"
              >
                <div className="mt-1 shrink-0">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-base flex items-center gap-1 group-hover:underline">
                    {venueName}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </p>
                  {event.location_address && (
                    <p className="text-sm text-muted-foreground">
                      <span className="lg:hidden">{city || event.location_address}</span>
                      <span className="hidden lg:inline">{event.location_address}</span>
                    </p>
                  )}
                </div>
              </a>
            );
          })()}
        </Activity>

        <Activity mode={isPaidEvent(event) ? "visible" : "hidden"}>
          <div className="flex items-start gap-3">
            <div className="mt-1 shrink-0">
              <Ticket className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-base">{getEventPriceLabel(event)}</p>
          </div>
        </Activity>
      </div>

      <div className="order-5 min-w-0 space-y-4 lg:space-y-6">
        <Separator />

        <div ref={registrationCardRef}>
          <EventRegistrationCard
            event={event}
            community={community}
            userData={userData}
            timeRemaining={timeRemaining}
            registrationDeadlineFormatted={registrationDeadlineFormatted}
            hasCustomQuestions={hasCustomQuestions}
            isPastEvent={isPastEvent}
            isExternalEvent={isExternalEvent}
            externalPlatform={externalPlatform}
            externalPlatformName={externalPlatformName}
            isRegistering={isRegistering}
            isUnregistering={isUnregistering}
            eventTrackingContext={eventTrackingContext}
            highlighted={highlightRegistrationCard}
            hackathon={hackathon}
          />
        </div>
      </div>

      <div className="order-6 min-w-0 lg:hidden">
        <EventAttendeesAvatars
          event={event}
          userData={userData}
          isExternalEvent={isExternalEvent}
        />
      </div>

      <div className="order-7 min-w-0 space-y-6">
        <Activity mode={event.description ? "visible" : "hidden"}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">About Event</h2>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {event.description || ""}
              </p>
            </div>
          </div>
        </Activity>

        <Activity
          mode={
            (event.event_type === "online" || event.event_type === "hybrid") &&
            !!event.online_meeting_link
              ? "visible"
              : "hidden"
          }
        >
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Video className="h-4 w-4" />
              Online Meeting
            </h3>

            <Activity
              mode={isExternalEvent || isUserRegistered ? "visible" : "hidden"}
            >
              <Button asChild variant="outline" className="w-full" size="sm">
                <a
                  href={event.online_meeting_link || ""}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Meeting
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </Activity>

            <Activity
              mode={
                !isExternalEvent && !isUserRegistered ? "visible" : "hidden"
              }
            >
              <p className="text-sm text-muted-foreground">
                Register to access the meeting link
              </p>
            </Activity>
          </div>
        </Activity>

        <EventLocationMapSection event={event} mapHeight={220} />
      </div>
    </div>
  );
}
