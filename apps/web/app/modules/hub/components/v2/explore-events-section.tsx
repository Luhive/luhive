import type { HubEventSummary } from "~/modules/hub/model/hub-v2-types";
import { ExploreEventCard } from "~/modules/hub/components/v2/explore-event-card";
import { HubEmptyMessage } from "~/modules/hub/components/v2/hub-empty-message";
import {
  eventGridClassName,
  sectionClassName,
} from "~/modules/hub/components/v2/hub-grid-layout";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
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
  const isShowingAll = isExpanded || isSearching;
  const visible = isShowingAll ? matches : matches.slice(0, PREVIEW_COUNT);

  return (
    <section ref={sectionRef} aria-labelledby={HEADING_ID} className={sectionClassName}>
      <HubSectionHeader
        id={HEADING_ID}
        title="Explore Events"
        isExpanded={isExpanded}
        onToggle={isSearching ? undefined : toggle}
        controlsId={LIST_ID}
      />

      <div id={LIST_ID} className="flex w-full flex-col gap-10 sm:gap-14">
        {visible.length === 0 ? (
          <HubEmptyMessage>
            {isSearching
              ? "No upcoming events match your search."
              : "No upcoming events right now. See all to browse past events."}
          </HubEmptyMessage>
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

        {isShowingAll && (
          <PastEventsBlock pastEvents={pastEvents} normalizedQuery={normalizedQuery} />
        )}
      </div>
    </section>
  );
}
