export { loader } from "~/modules/hub/server/hub-v2-loader.server";
export { meta, links } from "~/modules/hub/model/hub-v2-meta";

/** Paints under the notch; content is padded back with safe-area insets. */
export const handle = { viewportFit: "cover" };

import { Suspense, useDeferredValue, useState } from "react";
import { Await, useLoaderData } from "react-router";
import type { HubV2LoaderData } from "~/modules/hub/model/hub-v2-types";
import { HubV2Navigation } from "~/modules/hub/components/v2/hub-v2-navigation";
import { HubAccountActions } from "~/modules/hub/components/v2/hub-account-actions";
import { HubV2Footer } from "~/modules/hub/components/v2/hub-v2-footer";
import { HubBackdrop } from "~/modules/hub/components/v2/hub-backdrop";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
import { ExploreCommunitiesSection } from "~/modules/hub/components/v2/explore-communities-section";
import { ExploreEventsSection } from "~/modules/hub/components/v2/explore-events-section";
import {
  safeAreaGutterClassName,
  sectionClassName,
} from "~/modules/hub/components/v2/hub-grid-layout";
import {
  CommunitySectionSkeleton,
  EventGridSkeleton,
} from "~/modules/hub/components/v2/hub-skeletons";
import { normalizeSearchQuery } from "~/modules/hub/utils/matches-search-query";
import { EventPreviewDrawer } from "~/modules/hub/components/v2/event-preview-drawer";
import { isEventPreviewChange } from "~/modules/hub/utils/is-event-preview-change";

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
  if (!formMethod && isEventPreviewChange(currentUrl, nextUrl)) return false;
  return defaultShouldRevalidate;
}

export default function HubV2Page() {
  const { viewer, communities, upcomingEvents, pastEvents } = useLoaderData<HubV2LoaderData>();
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = normalizeSearchQuery(useDeferredValue(searchQuery));

  return (
    <div className="hub-touch-surface isolate flex min-h-svh flex-col bg-white font-inter text-[#111] antialiased">
      <HubBackdrop />
      <HubV2Navigation
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        accountActions={
          <Suspense fallback={<HubAccountActions viewer={null} isViewerPending />}>
            <Await resolve={viewer}>{(user) => <HubAccountActions viewer={user} />}</Await>
          </Suspense>
        }
      />

      <main
        className={`mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-16 pb-24 pt-6 sm:gap-20 md:pt-10 lg:gap-[104px] lg:pb-32 ${safeAreaGutterClassName}`}
      >
        <Suspense
          fallback={
            <div className={sectionClassName}>
              <HubSectionHeader id="explore-communities-loading" title="Explore Communities" />
              <CommunitySectionSkeleton />
            </div>
          }
        >
          <Await resolve={communities}>
            {(resolved) => (
              <ExploreCommunitiesSection communities={resolved} normalizedQuery={normalizedQuery} />
            )}
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
              <ExploreEventsSection
                upcomingEvents={resolved}
                pastEvents={pastEvents}
                normalizedQuery={normalizedQuery}
              />
            )}
          </Await>
        </Suspense>
      </main>

      <HubV2Footer />
      <EventPreviewDrawer />
    </div>
  );
}
