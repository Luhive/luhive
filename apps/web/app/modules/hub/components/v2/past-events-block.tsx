import { Suspense } from "react";
import { Await } from "react-router";
import type { HubEventSummary } from "~/modules/hub/model/hub-v2-types";
import { ExploreEventCard } from "~/modules/hub/components/v2/explore-event-card";
import { HubEmptyMessage } from "~/modules/hub/components/v2/hub-empty-message";
import { eventGridClassName } from "~/modules/hub/components/v2/hub-grid-layout";
import { EventGridSkeleton } from "~/modules/hub/components/v2/hub-skeletons";
import { getRiseDelayMs } from "~/modules/hub/utils/get-rise-delay-ms";
import { matchesSearchQuery } from "~/modules/hub/utils/matches-search-query";

type PastEventsBlockProps = {
  pastEvents: Promise<HubEventSummary[]>;
  normalizedQuery: string;
  /** Shown when no past event matches; null renders nothing. */
  emptyMessage: string | null;
  isLeading?: boolean;
};

type PastEventsGridProps = {
  events: HubEventSummary[];
  normalizedQuery: string;
  emptyMessage: string | null;
};

function PastEventsGrid({ events, normalizedQuery, emptyMessage }: PastEventsGridProps) {
  const matches = events.filter((event) =>
    matchesSearchQuery(normalizedQuery, [event.title, event.locationName, event.communityName]),
  );

  if (matches.length === 0) {
    return emptyMessage ? <HubEmptyMessage>{emptyMessage}</HubEmptyMessage> : null;
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PastEventsDivider />
      <div className={eventGridClassName}>
        {matches.map((event, index) => (
          <ExploreEventCard
            key={event.id}
            event={event}
            riseDelayMs={120 + getRiseDelayMs(index)}
            isPast
          />
        ))}
      </div>
    </div>
  );
}

function PastEventsDivider() {
  return (
    <div className="animate-hub-rise flex items-center gap-4">
      <h3 className="shrink-0 text-[16px] font-medium leading-none text-[#888] sm:text-[17px]">
        Past events
      </h3>
      <span aria-hidden className="h-px flex-1 origin-left bg-[#ededed]" />
    </div>
  );
}

export function PastEventsBlock({
  pastEvents,
  normalizedQuery,
  emptyMessage,
  isLeading = false,
}: PastEventsBlockProps) {
  return (
    <div className={isLeading ? undefined : "pt-2 sm:pt-4"}>
      <Suspense
        fallback={
          <div className="flex flex-col gap-6 sm:gap-8">
            <PastEventsDivider />
            <EventGridSkeleton count={4} />
          </div>
        }
      >
        <Await resolve={pastEvents}>
          {(events) => (
            <PastEventsGrid
              events={events}
              normalizedQuery={normalizedQuery}
              emptyMessage={emptyMessage}
            />
          )}
        </Await>
      </Suspense>
    </div>
  );
}
