export const communityGridClassName =
  "grid w-full grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3";

/** Phone layout for communities: one grouped list instead of stacked cards. */
export const communityListFrameClassName =
  "w-full rounded-[24px] bg-[#f6f6f6] p-1 shadow-[0px_4px_12px_-8px_rgba(0,0,0,0.06)]";

export const communityListClassName =
  "divide-y divide-[#f1f1f3] overflow-hidden rounded-[20px] bg-white drop-shadow-[0px_4px_7px_rgba(0,0,0,0.05)]";

export const eventGridClassName =
  "grid w-full grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4";

/** Page gutter that also clears landscape notches (needs `viewport-fit=cover`). */
export const safeAreaGutterClassName =
  "pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]";

/** Wider drawer gutter from `sm` up, with the same notch clearance. */
export const drawerGutterClassName =
  "pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))]";

export const sectionClassName =
  "flex w-full scroll-mt-6 flex-col gap-6 sm:gap-10 md:scroll-mt-[96px]";
