export { loader } from "~/modules/hub/server/hub-v2-loader.server";
export { links } from "~/modules/hub/model/hub-v2-meta";

export const handle = { viewportFit: "cover" };

export function meta() {
  return [
    { title: "Prototype · Hub communities on mobile" },
    { name: "robots", content: "noindex, nofollow" },
    { name: "theme-color", content: "#ffffff" },
  ];
}

import { Suspense, useCallback, useState } from "react";
import { Await, useLoaderData, useSearchParams } from "react-router";
import type { HubV2LoaderData } from "~/modules/hub/model/hub-v2-types";
import { HubV2Navigation } from "~/modules/hub/components/v2/hub-v2-navigation";
import { HubAccountActions } from "~/modules/hub/components/v2/hub-account-actions";
import { HubV2Footer } from "~/modules/hub/components/v2/hub-v2-footer";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
import { ExploreCommunitiesSection } from "~/modules/hub/components/v2/explore-communities-section";
import { ExploreEventsSection } from "~/modules/hub/components/v2/explore-events-section";
import { EventPreviewDrawer } from "~/modules/hub/components/v2/event-preview-drawer";
import {
  safeAreaGutterClassName,
  sectionClassName,
} from "~/modules/hub/components/v2/hub-grid-layout";
import {
  CommunityGridSkeleton,
  EventGridSkeleton,
} from "~/modules/hub/components/v2/hub-skeletons";
import { PrototypePicker } from "~/prototypes/hub-communities/prototype-picker";
import { RailVariant } from "~/prototypes/hub-communities/rail-variant";
import { ListVariant } from "~/prototypes/hub-communities/list-variant";
import { StripVariant } from "~/prototypes/hub-communities/strip-variant";
import { TilesVariant } from "~/prototypes/hub-communities/tiles-variant";
import { SummaryVariant } from "~/prototypes/hub-communities/summary-variant";
import { withSampleCommunities } from "~/prototypes/hub-communities/sample-communities";

const VARIANTS = [
  { name: "Rail", Component: RailVariant },
  { name: "List", Component: ListVariant },
  { name: "Strip", Component: StripVariant },
  { name: "Tiles", Component: TilesVariant },
  { name: "Summary", Component: SummaryVariant },
];

const HARNESS_PARAMS = ["v", "event"];

function withoutHarnessParams(url: URL) {
  const params = new URLSearchParams(url.search);
  HARNESS_PARAMS.forEach((param) => params.delete(param));
  params.sort();
  return `${url.pathname}?${params.toString()}`;
}

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}) {
  if (!formMethod && withoutHarnessParams(currentUrl) === withoutHarnessParams(nextUrl)) return false;
  return defaultShouldRevalidate;
}

function parseVariantIndex(value: string | null) {
  const index = (Number.parseInt(value ?? "", 10) || 1) - 1;
  return index >= 0 && index < VARIANTS.length ? index : 0;
}

export default function HubCommunitiesPrototype() {
  const { viewer, communities, upcomingEvents, pastEvents } = useLoaderData<HubV2LoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeIndex = parseVariantIndex(searchParams.get("v"));
  const [replayCount, setReplayCount] = useState(0);
  const { Component: ActiveVariant } = VARIANTS[activeIndex];

  const selectVariant = useCallback(
    (index: number) => {
      const next = new URLSearchParams(searchParams);
      next.set("v", String(index + 1));
      setSearchParams(next, { replace: true, preventScrollReset: true });
    },
    [searchParams, setSearchParams],
  );
  const replay = useCallback(() => setReplayCount((count) => count + 1), []);

  return (
    <div className="hub-touch-surface flex min-h-svh flex-col bg-white font-inter text-[#111] antialiased">
      <HubV2Navigation
        searchQuery=""
        onSearchQueryChange={() => {}}
        accountActions={
          <Suspense fallback={<HubAccountActions viewer={null} />}>
            <Await resolve={viewer}>{(user) => <HubAccountActions viewer={user} />}</Await>
          </Suspense>
        }
      />

      <main
        className={`mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-16 pb-32 pt-6 sm:gap-20 md:pt-10 lg:gap-[104px] ${safeAreaGutterClassName}`}
      >
        <Suspense
          fallback={
            <div className={sectionClassName}>
              <HubSectionHeader id="explore-communities-loading" title="Explore Communities" />
              <CommunityGridSkeleton count={6} />
            </div>
          }
        >
          <Await resolve={communities}>
            {(resolved) => {
              const padded = withSampleCommunities(resolved);
              return (
                <>
                  <div className="sm:hidden" key={`${activeIndex}-${replayCount}`}>
                    <ActiveVariant communities={padded} />
                  </div>
                  <div className="hidden sm:block">
                    <ExploreCommunitiesSection communities={padded} normalizedQuery="" />
                  </div>
                </>
              );
            }}
          </Await>
        </Suspense>

        <Suspense
          fallback={
            <div className={sectionClassName}>
              <HubSectionHeader id="explore-events-loading" title="Explore Events" />
              <EventGridSkeleton count={8} />
            </div>
          }
        >
          <Await resolve={upcomingEvents}>
            {(resolved) => (
              <ExploreEventsSection upcomingEvents={resolved} pastEvents={pastEvents} normalizedQuery="" />
            )}
          </Await>
        </Suspense>
      </main>

      <HubV2Footer />
      <EventPreviewDrawer />
      <PrototypePicker
        names={VARIANTS.map((variant) => variant.name)}
        activeIndex={activeIndex}
        onSelect={selectVariant}
        onReplay={replay}
      />
    </div>
  );
}
