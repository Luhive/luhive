import type { Community } from "~/modules/hub/model/hub-types";
import { ExploreCommunityCard } from "~/modules/hub/components/v2/explore-community-card";
import { ExploreCommunityRow } from "~/modules/hub/components/v2/explore-community-row";
import { HubEmptyMessage } from "~/modules/hub/components/v2/hub-empty-message";
import {
  communityGridClassName,
  communityListClassName,
  communityListFrameClassName,
  sectionClassName,
} from "~/modules/hub/components/v2/hub-grid-layout";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
import { HubSectionMoreButton } from "~/modules/hub/components/v2/hub-section-more-button";
import { useSectionExpansion } from "~/modules/hub/hooks/use-section-expansion";
import { getRiseDelayMs } from "~/modules/hub/utils/get-rise-delay-ms";
import { matchesSearchQuery } from "~/modules/hub/utils/matches-search-query";
import { cn } from "~/shared/lib/utils/cn";

/** Phones show a compact list; from `sm` up the card grid has room for more. */
const LIST_PREVIEW_COUNT = 4;
const GRID_PREVIEW_COUNT = 6;
const HEADING_ID = "explore-communities-heading";
const LIST_ID = "explore-communities-list";
const GRID_ID = "explore-communities-grid";

type ExploreCommunitiesSectionProps = {
  communities: Community[];
  normalizedQuery: string;
};

function getPreviewRiseDelayMs(index: number, previewCount: number) {
  return getRiseDelayMs(index < previewCount ? index : index - previewCount);
}

export function ExploreCommunitiesSection({
  communities,
  normalizedQuery,
}: ExploreCommunitiesSectionProps) {
  const { sectionRef, isExpanded, toggle } = useSectionExpansion<HTMLElement>();
  const isSearching = normalizedQuery.length > 0;

  const matches = communities.filter((community) =>
    matchesSearchQuery(normalizedQuery, [community.name, community.tagline, community.description]),
  );
  const isShowingAll = isExpanded || isSearching;
  const listItems = isShowingAll ? matches : matches.slice(0, LIST_PREVIEW_COUNT);
  const gridItems = isShowingAll ? matches : matches.slice(0, GRID_PREVIEW_COUNT);
  const canToggle = !isSearching && communities.length > LIST_PREVIEW_COUNT;
  const hasMoreThanGrid = communities.length > GRID_PREVIEW_COUNT;

  return (
    <section ref={sectionRef} aria-labelledby={HEADING_ID} className={sectionClassName}>
      <HubSectionHeader
        id={HEADING_ID}
        title="Explore Communities"
        isExpanded={isExpanded}
        onToggle={canToggle && hasMoreThanGrid ? toggle : undefined}
        controlsId={GRID_ID}
        toggleClassName="max-sm:hidden"
      />

      {matches.length === 0 ? (
        <HubEmptyMessage>
          {isSearching ? "No communities match your search." : "No communities yet. Check back soon."}
        </HubEmptyMessage>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:hidden">
            <div className={communityListFrameClassName}>
              <ul id={LIST_ID} className={communityListClassName}>
                {listItems.map((community, index) => (
                  <ExploreCommunityRow
                    key={community.id}
                    community={community}
                    riseDelayMs={getPreviewRiseDelayMs(index, LIST_PREVIEW_COUNT)}
                  />
                ))}
              </ul>
            </div>
            {canToggle && (
              <HubSectionMoreButton
                label="See all communities"
                isExpanded={isExpanded}
                onToggle={toggle}
                controlsId={LIST_ID}
              />
            )}
          </div>

          <div id={GRID_ID} className={cn(communityGridClassName, "hidden sm:grid")}>
            {gridItems.map((community, index) => (
              <ExploreCommunityCard
                key={community.id}
                community={community}
                riseDelayMs={getPreviewRiseDelayMs(index, GRID_PREVIEW_COUNT)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
