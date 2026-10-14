import { Link } from "react-router";
import { ArrowUpRight, MapPin, Ticket, Video } from "lucide-react";
import type {
  EventPreviewLayout,
  HubEventPreview,
  HubEventSummary,
} from "~/modules/hub/model/hub-v2-types";
import {
  formatEventDateLabel,
  formatEventTimeRange,
} from "~/modules/hub/utils/format-event-schedule";
import { getEventPriceLabel } from "~/modules/events/utils/event-price-label";
import { DrawerDescription, DrawerTitle } from "~/shared/components/ui/drawer";
import { Skeleton } from "~/shared/components/ui/skeleton";
import { Routes } from "~/shared/lib/routing/routes";
import { cn } from "~/shared/lib/utils/cn";
import verifiedBadge from "~/assets/images/hub-v2/verified-badge.svg";

type EventPreviewContentProps = {
  summary: HubEventSummary;
  preview: HubEventPreview | null;
  isLoadingDetails: boolean;
  layout: EventPreviewLayout;
};

type SectionProps = {
  event: HubEventSummary;
  preview: HubEventPreview | null;
  isLoadingDetails: boolean;
};

type DetailRowProps = {
  icon: typeof MapPin;
  primary: string;
  secondary?: string | null;
};

function hasEnded(event: HubEventSummary) {
  return new Date(event.endTime ?? event.startTime).getTime() < Date.now();
}

function Cover({ event, className }: { event: HubEventSummary; className?: string }) {
  return (
    <div className={cn("relative aspect-square w-full overflow-hidden rounded-[14px] bg-[#f6f6f6]", className)}>
      {event.coverUrl && (
        <img src={event.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
      )}
    </div>
  );
}

function HeaderText({ event, preview, isLarge }: SectionProps & { isLarge?: boolean }) {
  const schedule = `${formatEventDateLabel(event.startTime, event.timezone)} • ${formatEventTimeRange(event.startTime, event.endTime, event.timezone)}`;

  return (
    <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3 sm:pt-1">
      <DrawerDescription className="text-[13px] leading-[1.44] text-[#8c8e9a] sm:text-[14px]">
        {hasEnded(event) ? `Ended · ${schedule}` : schedule}
      </DrawerDescription>
      <DrawerTitle
        className={cn(
          "text-[20px] font-semibold leading-[1.2] text-[#111] sm:text-[26px]",
          isLarge && "md:text-[32px]",
        )}
      >
        {event.title}
      </DrawerTitle>
      <Link
        to={Routes.community.detail(event.communitySlug)}
        prefetch="intent"
        className="flex w-fit min-w-0 items-center gap-2 rounded-md text-[14px] text-[#5f616b] transition-colors duration-150 hover:text-[#111]"
      >
        {preview?.communityLogoUrl ? (
          <img src={preview.communityLogoUrl} alt="" className="size-5 shrink-0 rounded-[6px] object-cover" />
        ) : (
          <span className="size-5 shrink-0 rounded-[6px] bg-[#f1f1f3]" />
        )}
        <span className="truncate">{event.communityName}</span>
        {preview?.isCommunityVerified && (
          <img src={verifiedBadge} alt="Verified" width={16} height={16} className="block max-w-none shrink-0" />
        )}
      </Link>
    </div>
  );
}

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

function Details({ preview, isLoadingDetails, className }: SectionProps & { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
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
  );
}

function About({ preview, isLoadingDetails }: SectionProps) {
  if (preview?.description) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[#8c8e9a]">About</p>
        <p className="line-clamp-[8] whitespace-pre-wrap text-[15px] leading-[1.55] text-[#3f4049]">
          {preview.description}
        </p>
      </div>
    );
  }
  if (!isLoadingDetails) return null;
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-full rounded-full bg-[#f3f3f5]" />
      <Skeleton className="h-3 w-11/12 rounded-full bg-[#f3f3f5]" />
      <Skeleton className="h-3 w-3/5 rounded-full bg-[#f3f3f5]" />
    </div>
  );
}

function EventPageCta({ event, className }: { event: HubEventSummary; className?: string }) {
  return (
    <Link
      to={Routes.community.event(event.communitySlug, event.slug)}
      prefetch="render"
      viewTransition
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-[44px] bg-black px-6 text-[15px] font-medium text-white outline-none transition-[transform,background-color] duration-150 ease-out-strong hover:bg-[#262626] focus-visible:ring-2 focus-visible:ring-[#111]/20 focus-visible:ring-offset-2 active:scale-[0.98]",
        className,
      )}
    >
      {hasEnded(event) ? "View event page" : "Go to event page"}
      <ArrowUpRight className="size-[18px]" strokeWidth={2} aria-hidden />
    </Link>
  );
}

function StackedLayout({ event, preview, isLoadingDetails }: SectionProps) {
  const sectionProps = { event, preview, isLoadingDetails };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-6 pt-4 sm:px-8 sm:pt-6">
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:gap-6">
          <Cover event={event} />
          <HeaderText {...sectionProps} />
        </div>
        <Details {...sectionProps} />
        <About {...sectionProps} />
      </div>
      <div className="border-t border-[#f0f0f0] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 sm:px-8">
        <EventPageCta event={event} />
      </div>
    </div>
  );
}

/** Full-width sheet whose content stays on the hub's 1000px column from `md` up. */
function WideLayout({ event, preview, isLoadingDetails }: SectionProps) {
  const sectionProps = { event, preview, isLoadingDetails };
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1040px] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 sm:px-8 sm:pt-6 md:grid md:grid-cols-[280px_minmax(0,1fr)] md:gap-10 md:pb-10 md:pt-8">
        <Cover event={event} className="hidden md:block" />
        <div className="flex min-w-0 flex-col gap-6">
          <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:gap-6 md:block">
            <Cover event={event} className="md:hidden" />
            <HeaderText {...sectionProps} isLarge />
          </div>
          <Details {...sectionProps} className="md:grid md:grid-cols-2 md:gap-x-6" />
          <About {...sectionProps} />
          <EventPageCta event={event} className="md:w-fit md:self-start md:px-8" />
        </div>
      </div>
    </div>
  );
}

export function EventPreviewContent({ summary, preview, isLoadingDetails, layout }: EventPreviewContentProps) {
  const sectionProps = { event: preview ?? summary, preview, isLoadingDetails };
  return layout === "wide" ? <WideLayout {...sectionProps} /> : <StackedLayout {...sectionProps} />;
}
