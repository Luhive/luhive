import { useState } from "react";
import type { HubEventSummary } from "~/modules/hub/model/hub-v2-types";
import { EventPreviewContent } from "~/modules/hub/components/v2/event-preview-content";
import { useEventPreviewSelection } from "~/modules/hub/hooks/use-event-preview-selection";
import { useHubEventPreviewQuery } from "~/modules/hub/hooks/use-hub-event-preview-query";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/shared/components/ui/drawer";
import { Skeleton } from "~/shared/components/ui/skeleton";
import { drawerGutterClassName } from "~/modules/hub/components/v2/hub-grid-layout";

export function EventPreviewDrawer() {
  const { selectedEventId, selectedSummary, closePreview } = useEventPreviewSelection();
  // Keep the last event on screen while the drawer animates closed.
  const [shownEventId, setShownEventId] = useState(selectedEventId);
  const [shownSummary, setShownSummary] = useState<HubEventSummary | null>(selectedSummary);
  if (selectedEventId && selectedEventId !== shownEventId) {
    setShownEventId(selectedEventId);
    setShownSummary(selectedSummary);
  }

  const { data: preview, isPending, isError } = useHubEventPreviewQuery(shownEventId);
  const summary = preview ?? shownSummary;

  return (
    <Drawer
      open={Boolean(selectedEventId)}
      onOpenChange={(isOpen) => {
        if (!isOpen) closePreview();
      }}
    >
      <DrawerContent className="hub-touch-surface hub-event-drawer inset-x-0 w-full bg-white font-inter text-[#111] data-[vaul-drawer-direction=bottom]:max-h-[88dvh] data-[vaul-drawer-direction=bottom]:rounded-t-[28px] data-[vaul-drawer-direction=bottom]:border-t-0">
        {summary ? (
          <EventPreviewContent
            summary={summary}
            preview={preview ?? null}
            isLoadingDetails={isPending && !isError}
          />
        ) : isPending ? (
          <PreviewLoadingState />
        ) : (
          <PreviewUnavailableState />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function PreviewLoadingState() {
  return (
    <div
      className={`mx-auto flex w-full max-w-[1040px] flex-col gap-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:pt-6 md:pt-8 ${drawerGutterClassName}`}
    >
      <DrawerTitle className="sr-only">Loading event</DrawerTitle>
      <DrawerDescription className="sr-only">Event details are loading.</DrawerDescription>
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:gap-6 md:grid-cols-[280px_minmax(0,1fr)] md:gap-10">
        <Skeleton className="aspect-square w-full rounded-[14px] bg-[#f3f3f5]" />
        <div className="flex flex-col gap-3 pt-1">
          <Skeleton className="h-3 w-1/2 rounded-full bg-[#f3f3f5]" />
          <Skeleton className="h-5 w-4/5 rounded-full bg-[#f1f1f3]" />
          <Skeleton className="h-3 w-1/3 rounded-full bg-[#f3f3f5]" />
        </div>
      </div>
    </div>
  );
}

function PreviewUnavailableState() {
  return (
    <div
      className={`flex flex-col items-center gap-2 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pt-8 text-center ${drawerGutterClassName}`}
    >
      <DrawerTitle className="text-[18px] font-semibold text-[#111]">Event unavailable</DrawerTitle>
      <DrawerDescription className="text-[14px] text-[#8c8e9a]">
        This event may have been removed or made private.
      </DrawerDescription>
    </div>
  );
}
