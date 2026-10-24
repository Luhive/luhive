import { ActivityCardShell, ActivityGridFrame } from "~/modules/profile/components/profile-activity-grid";
import { profileCardClassName } from "~/modules/profile/components/profile-tokens";
import type { ActivityWindow } from "~/modules/profile/model/profile-activity";

export function ProfileStatSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className={`${profileCardClassName} h-[148px] animate-pulse bg-[#f3f3f4]`} />
      <div className={`${profileCardClassName} h-[148px] animate-pulse bg-[#f3f3f4]`} />
    </div>
  );
}

const skeletonMarkClassName = "activity-skeleton-pulse shrink-0 bg-[#ececee]";
const skeletonBarClassName = "activity-skeleton-pulse block rounded-full bg-[#ececee]";

function CommunitySkeletonRow({ nameWidth }: { nameWidth: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-b-0">
      <span aria-hidden className={`${skeletonMarkClassName} size-10 rounded-[10px]`} />
      <span className="min-w-0 flex-1">
        <span aria-hidden className={`${skeletonBarClassName} h-3.5 ${nameWidth}`} />
        <span aria-hidden className={`${skeletonBarClassName} mt-2 h-4 w-14`} />
      </span>
      <span aria-hidden className={`${skeletonBarClassName} hidden h-3 w-16 shrink-0 sm:block`} />
    </div>
  );
}

function EventSkeletonRow({ titleWidth }: { titleWidth: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-b-0">
      <span aria-hidden className={`${skeletonMarkClassName} size-10 rounded-[8px]`} />
      <span className="min-w-0 flex-1">
        <span aria-hidden className={`${skeletonBarClassName} h-3.5 ${titleWidth}`} />
        <span className="mt-2 flex items-center gap-2">
          <span aria-hidden className={`${skeletonBarClassName} h-3 w-36`} />
          <span aria-hidden className={`${skeletonBarClassName} h-4 w-14`} />
        </span>
      </span>
    </div>
  );
}

export function ProfileCommunitiesSkeleton() {
  return (
    <div aria-busy="true">
      <CommunitySkeletonRow nameWidth="w-32" />
      <CommunitySkeletonRow nameWidth="w-40" />
      <CommunitySkeletonRow nameWidth="w-24" />
      <p className="sr-only">Loading communities</p>
    </div>
  );
}

export function ProfileEventsSkeleton() {
  return (
    <div aria-busy="true">
      <EventSkeletonRow titleWidth="w-44" />
      <EventSkeletonRow titleWidth="w-36" />
      <EventSkeletonRow titleWidth="w-48" />
      <p className="sr-only">Loading events</p>
    </div>
  );
}

/** The real card with only the data missing: real month labels, the same grid, the same height. */
export function ProfileActivitySkeleton({ range }: { range: ActivityWindow }) {
  return (
    <ActivityCardShell busy>
      <ActivityGridFrame range={range} pulse />
      <div aria-hidden className="mt-3 flex min-h-[18px] min-w-0 items-center justify-between gap-x-2">
        <span className="h-3 w-[46%] max-w-[168px] rounded-full bg-black/[0.05]" />
        <span className="h-3 w-[40%] max-w-[148px] rounded-full bg-black/[0.05]" />
      </div>
      <p className="sr-only">Loading activity</p>
    </ActivityCardShell>
  );
}

export function ProfileActivityUnavailable({ range }: { range: ActivityWindow }) {
  return (
    <ActivityCardShell>
      <ActivityGridFrame range={range} />
      <p className="mt-3 min-h-[18px] text-[12px] leading-[18px] text-[#8c8e9a]">Activity is unavailable right now.</p>
    </ActivityCardShell>
  );
}
