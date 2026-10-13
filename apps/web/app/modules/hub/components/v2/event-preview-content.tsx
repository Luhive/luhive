import { Link } from "react-router";
import { ArrowUpRight, MapPin, Ticket, Video } from "lucide-react";
import type { HubEventPreview, HubEventSummary } from "~/modules/hub/model/hub-v2-types";
import {
  formatEventDateLabel,
  formatEventTimeRange,
} from "~/modules/hub/utils/format-event-schedule";
import { getEventPriceLabel } from "~/modules/events/utils/event-price-label";
import { DrawerDescription, DrawerTitle } from "~/shared/components/ui/drawer";
import { Skeleton } from "~/shared/components/ui/skeleton";
import { Routes } from "~/shared/lib/routing/routes";
import verifiedBadge from "~/assets/images/hub-v2/verified-badge.svg";

type EventPreviewContentProps = {
  summary: HubEventSummary;
  preview: HubEventPreview | null;
  isLoadingDetails: boolean;
};

type DetailRowProps = {
  icon: typeof MapPin;
  primary: string;
  secondary?: string | null;
};

function DetailRow({ icon: Icon, primary, secondary }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f6f6f6] text-[#5f616b]">
        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-1 pt-[3px]">
        <p className="text-[15px] font-medium leading-tight text-[#111]">{primary}</p>
        {secondary && <p className="text-[13px] leading-snug text-[#8c8e9a]">{secondary}</p>}
      </div>
    </div>
  );
}

function hasEnded(event: HubEventSummary) {
  return new Date(event.endTime ?? event.startTime).getTime() < Date.now();
}

export function EventPreviewContent({ summary, preview, isLoadingDetails }: EventPreviewContentProps) {
  const event = preview ?? summary;
  const isPast = hasEnded(event);
  const schedule = `${formatEventDateLabel(event.startTime, event.timezone)} • ${formatEventTimeRange(event.startTime, event.endTime, event.timezone)}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-6 pt-4 sm:px-8 sm:pt-6">
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:gap-6">
          <div className="relative aspect-square w-full overflow-hidden rounded-[14px] bg-[#f6f6f6]">
            {event.coverUrl && (
              <img src={event.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3 sm:pt-1">
            <DrawerDescription className="text-[13px] leading-[1.44] text-[#8c8e9a] sm:text-[14px]">
              {isPast ? `Ended · ${schedule}` : schedule}
            </DrawerDescription>
            <DrawerTitle className="text-[20px] font-semibold leading-[1.2] text-[#111] sm:text-[26px]">
              {event.title}
            </DrawerTitle>
            <Link
              to={Routes.community.detail(event.communitySlug)}
              prefetch="intent"
              className="flex w-fit min-w-0 items-center gap-2 rounded-md text-[14px] text-[#5f616b] transition-colors duration-150 hover:text-[#111]"
            >
              {preview?.communityLogoUrl ? (
                <img
                  src={preview.communityLogoUrl}
                  alt=""
                  className="size-5 shrink-0 rounded-[6px] object-cover"
                />
              ) : (
                <span className="size-5 shrink-0 rounded-[6px] bg-[#f1f1f3]" />
              )}
              <span className="truncate">{event.communityName}</span>
              {preview?.isCommunityVerified && (
                <img src={verifiedBadge} alt="Verified" width={16} height={16} className="block max-w-none shrink-0" />
              )}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {preview ? (
            <>
              {preview.isOnline ? (
                <DetailRow icon={Video} primary="Online event" />
              ) : (
                (preview.locationName || preview.locationAddress) && (
                  <DetailRow
                    icon={MapPin}
                    primary={preview.locationName ?? preview.locationAddress ?? ""}
                    secondary={preview.locationName ? preview.locationAddress : null}
                  />
                )
              )}
              <DetailRow
                icon={Ticket}
                primary={getEventPriceLabel({ price_minor: preview.priceMinor, currency: preview.currency })}
              />
            </>
          ) : (
            isLoadingDetails && (
              <>
                <DetailRowSkeleton />
                <DetailRowSkeleton />
              </>
            )
          )}
        </div>

        {preview?.description ? (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[#8c8e9a]">About</p>
            <p className="line-clamp-[8] whitespace-pre-wrap text-[15px] leading-[1.55] text-[#3f4049]">
              {preview.description}
            </p>
          </div>
        ) : (
          isLoadingDetails && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-full rounded-full bg-[#f3f3f5]" />
              <Skeleton className="h-3 w-11/12 rounded-full bg-[#f3f3f5]" />
              <Skeleton className="h-3 w-3/5 rounded-full bg-[#f3f3f5]" />
            </div>
          )
        )}
      </div>

      <div className="border-t border-[#f0f0f0] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 sm:px-8">
        <Link
          to={Routes.community.event(event.communitySlug, event.slug)}
          prefetch="render"
          viewTransition
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[44px] bg-black px-6 text-[15px] font-medium text-white outline-none transition-[transform,background-color] duration-150 ease-out-strong hover:bg-[#262626] focus-visible:ring-2 focus-visible:ring-[#111]/20 focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          {isPast ? "View event page" : "Go to event page"}
          <ArrowUpRight className="size-[18px]" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function DetailRowSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-9 rounded-[10px] bg-[#f3f3f5]" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-2/5 rounded-full bg-[#f3f3f5]" />
        <Skeleton className="h-2.5 w-3/5 rounded-full bg-[#f5f5f7]" />
      </div>
    </div>
  );
}
