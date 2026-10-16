import { Link } from "react-router";
import type { CSSProperties, MouseEvent } from "react";
import { Video } from "lucide-react";
import type { HubEventSummary } from "~/modules/hub/model/hub-v2-types";
import { useEventPreviewSelection } from "~/modules/hub/hooks/use-event-preview-selection";
import { usePrefetchHubEventPreview } from "~/modules/hub/hooks/use-hub-event-preview-query";
import {
  formatEventDateLabel,
  formatEventTimeRange,
} from "~/modules/hub/utils/format-event-schedule";
import { Routes } from "~/shared/lib/routing/routes";
import { cn } from "~/shared/lib/utils/cn";
import locationPin from "~/assets/images/hub-v2/location-pin.svg";

type ExploreEventCardProps = {
  event: HubEventSummary;
  riseDelayMs: number;
  isPast?: boolean;
};

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
  );
}

export function ExploreEventCard({ event, riseDelayMs, isPast = false }: ExploreEventCardProps) {
  const { openPreview } = useEventPreviewSelection();
  const prefetchPreview = usePrefetchHubEventPreview();
  const warmPreview = () => prefetchPreview(event.id);

  return (
    <Link
      to={Routes.community.event(event.communitySlug, event.slug)}
      onClick={(clickEvent) => {
        if (!isPlainLeftClick(clickEvent)) return;
        clickEvent.preventDefault();
        openPreview(event);
      }}
      onPointerEnter={warmPreview}
      onFocus={warmPreview}
      onTouchStart={warmPreview}
      aria-haspopup="dialog"
      data-hub-control
      style={{ "--rise-delay": `${riseDelayMs}ms` } as CSSProperties}
      className="animate-hub-rise group flex min-w-0 flex-col gap-4 rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#111]/20 focus-visible:ring-offset-4 sm:gap-5"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[12px] bg-[#f6f6f6] transition-transform duration-150 ease-out-strong group-active:scale-[0.98]">
        {event.coverUrl ? (
          <img
            src={event.coverUrl}
            alt=""
            loading="lazy"
            className={cn(
              "absolute inset-0 size-full object-cover transition-[transform,filter] duration-300 ease-out-strong group-hover:scale-[1.035]",
              isPast && "grayscale-[35%] group-hover:grayscale-0",
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f6f6f6] to-[#ececef] p-4 text-center text-[15px] font-medium text-[#8c8e9a]">
            {event.communityName}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:gap-[14px]">
        <p className="flex min-w-0 items-center whitespace-nowrap text-[13px] leading-[1.44] text-[#8c8e9a] sm:text-[14px]">
          <span>{formatEventDateLabel(event.startTime, event.timezone)}</span>
          <span aria-hidden className="mx-[7px] text-[10px]">
            •
          </span>
          <span className="truncate">
            {formatEventTimeRange(event.startTime, event.endTime, event.timezone)}
          </span>
        </p>
        <div className="flex min-w-0 flex-col gap-[10px]">
          <h3 className="-my-[0.3em] truncate py-[0.3em] text-[17px] font-medium leading-normal text-[#111] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] sm:text-[20px]">
            {event.title}
          </h3>
          {event.isOnline ? (
            <p className="flex min-w-0 items-center gap-1 text-[14px] leading-normal text-[#8c8e9a]">
              <span className="flex h-4 w-[15px] shrink-0 items-center justify-center">
                <Video className="size-[13px]" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="truncate">Online</span>
            </p>
          ) : event.locationName && (
            <p className="flex min-w-0 items-center gap-1 text-[14px] leading-normal text-[#8c8e9a]">
              <span className="flex h-4 w-[15px] shrink-0 items-center justify-center">
                <img
                  src={locationPin}
                  alt=""
                  width={11.4286}
                  height={12.5714}
                  className="block max-w-none"
                />
              </span>
              <span className="truncate">{event.locationName}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
