import type { HubEventSummary } from "~/modules/hub/model/hub-v2-types";
import { ExploreEventCard } from "~/modules/hub/components/v2/explore-event-card";
import { HubEmptyMessage } from "~/modules/hub/components/v2/hub-empty-message";
import {
  eventGridClassName,
  sectionClassName,
} from "~/modules/hub/components/v2/hub-grid-layout";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
import { HubSectionMoreButton } from "~/modules/hub/components/v2/hub-section-more-button";
import { NoUpcomingEventsNotice } from "~/modules/hub/components/v2/no-upcoming-events-notice";
import { PastEventsBlock } from "~/modules/hub/components/v2/past-events-block";
import { useSectionExpansion } from "~/modules/hub/hooks/use-section-expansion";
import { getRiseDelayMs } from "~/modules/hub/utils/get-rise-delay-ms";
import { matchesSearchQuery } from "~/modules/hub/utils/matches-search-query";

const PREVIEW_COUNT = 8;
const HEADING_ID = "explore-events-heading";
const LIST_ID = "explore-events-list";

type ExploreEventsSectionProps = {
  upcomingEvents: HubEventSummary[];
  pastEvents: Promise<HubEventSummary[]>;
  normalizedQuery: string;
};

export function ExploreEventsSection({
  upcomingEvents,
  pastEvents,
  normalizedQuery,
}: ExploreEventsSectionProps) {
  const { sectionRef, isExpanded, toggle } = useSectionExpansion<HTMLElement>();
  const isSearching = normalizedQuery.length > 0;

  const matches = upcomingEvents.filter((event) =>
    matchesSearchQuery(normalizedQuery, [event.title, event.locationName, event.communityName]),
  );
  const hasUpcomingEvents = upcomingEvents.length > 0;
  const isShowingAll = isExpanded || isSearching;
  const visible = isShowingAll ? matches : matches.slice(0, PREVIEW_COUNT);
  const shouldShowPastEvents = isShowingAll || !hasUpcomingEvents;
  const canToggle = !isSearching && hasUpcomingEvents;

  let pastEmptyMessage: string | null = null;
  if (!hasUpcomingEvents) {
    pastEmptyMessage = isSearching ? "No events match your search." : "No past events yet.";
  } else if (!isSearching) {
    pastEmptyMessage = "No past events yet.";
  }

  return (
    <section ref={sectionRef} aria-labelledby={HEADING_ID} className={sectionClassName}>
      <HubSectionHeader
        id={HEADING_ID}
        title="Explore Events"
        isExpanded={isExpanded}
        onToggle={canToggle ? toggle : undefined}
        controlsId={LIST_ID}
        toggleClassName="max-sm:hidden"
      />

      <div
        id={LIST_ID}
        className={
          hasUpcomingEvents
            ? "flex w-full flex-col gap-10 sm:gap-14"
            : "flex w-full flex-col gap-8 sm:gap-10"
        }
      >
        {!hasUpcomingEvents ? (
          isSearching ? null : <NoUpcomingEventsNotice />
        ) : visible.length === 0 ? (
          <HubEmptyMessage>No upcoming events match your search.</HubEmptyMessage>
        ) : (
          <div className={eventGridClassName}>
            {visible.map((event, index) => (
              <ExploreEventCard
                key={event.id}
                event={event}
                riseDelayMs={getRiseDelayMs(index < PREVIEW_COUNT ? index : index - PREVIEW_COUNT)}
              />
            ))}
          </div>
        )}

        {shouldShowPastEvents && (
          <PastEventsBlock
            pastEvents={pastEvents}
            normalizedQuery={normalizedQuery}
            emptyMessage={pastEmptyMessage}
            isLeading={!hasUpcomingEvents}
          />
        )}
      </div>

      {canToggle && (
        <HubSectionMoreButton
          label="See all events"
          isExpanded={isExpanded}
          onToggle={toggle}
          controlsId={LIST_ID}
        />
      )}
    </section>
  );
}
