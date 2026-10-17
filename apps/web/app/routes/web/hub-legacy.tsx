export { loader } from "~/modules/hub/server/hub-legacy-loader.server";
export { meta } from "~/modules/hub/model/hub-legacy-meta";

import { useLoaderData, Await, useNavigation } from "react-router";
import { Suspense } from "react";
import { HubLegacyPageSkeleton } from "~/modules/hub/components/legacy/hub-legacy-page-skeleton";
import { Spinner } from "~/shared/components/ui/spinner";
import type { HubLegacyLoaderData } from "~/modules/hub/model/hub-legacy-types";
import { CommunityGrid } from "~/modules/hub/components/legacy/community-grid";
import { HubLegacyEmptyState } from "~/modules/hub/components/legacy/hub-legacy-empty-state";
import { HubLegacyHeader } from "~/modules/hub/components/legacy/hub-legacy-header";
import { Routes } from "~/shared/lib/routing/routes";

export default function HubLegacyPage() {
  const { data } = useLoaderData<HubLegacyLoaderData>();
  const navigation = useNavigation();
  const isCommunityTransitionLoading =
    navigation.state === "loading" &&
    (navigation.location?.pathname.startsWith(`${Routes.community.base}/`) ||
      navigation.location?.pathname.startsWith(`${Routes.dashboard.base}/`));

  return (
    <>
      {isCommunityTransitionLoading && (
        <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Going to Community...
            </p>
          </div>
        </div>
      )}

      <Suspense fallback={<HubLegacyPageSkeleton user={null} />}>
        <Await resolve={data}>
          {(resolvedData) => (
            <main className="py-8">
              <HubLegacyHeader />
              {resolvedData.communities.length === 0 ? (
                <HubLegacyEmptyState />
              ) : (
                <CommunityGrid communities={resolvedData.communities} />
              )}
            </main>
          )}
        </Await>
      </Suspense>
    </>
  );
}
