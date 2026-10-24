import type { ComponentProps } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ActivityTooltip, ActivityTooltipLine } from "~/modules/profile/model/profile-activity";
import { cn } from "~/shared/lib/utils/cn";

const DOT_TONE: Record<ActivityTooltipLine["tone"], string> = {
  event: "bg-primary",
  normal: "bg-[#FF9A66]",
  muted: "bg-black/15",
};

const TEXT_TONE: Record<ActivityTooltipLine["tone"], string> = {
  event: "font-medium text-[#111]",
  normal: "text-[#3f3f46]",
  muted: "text-[#8c8e9a]",
};

// White glass. No arrow: a solid arrow can't share the blur.
const GLASS_CLASS =
  "bg-white/75 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-black/[0.06] shadow-[0_12px_32px_-10px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.05)]";

type ProfileActivityTooltipProps = {
  tip: ActivityTooltip | null;
  open: boolean;
  /** Opening right after a close skips the animation (motion inventory M7). */
  instant: boolean;
  onPointerDownOutside: ComponentProps<typeof TooltipPrimitive.Content>["onPointerDownOutside"];
};

/**
 * Built on the Radix primitives rather than the shared shadcn `TooltipContent`, whose
 * tw-animate classes would fight the motion in app.css (`.activity-tooltip`).
 * Force-mounted so open and close are interruptible transitions; CSS hides it when closed.
 * Hidden from assistive tech: the grid announces the day through its own live region.
 */
export function ProfileActivityTooltip({ tip, open, instant, onPointerDownOutside }: ProfileActivityTooltipProps) {
  return (
    <TooltipPrimitive.Portal forceMount>
      <TooltipPrimitive.Content
        forceMount
        aria-hidden
        side="top"
        sideOffset={8}
        collisionPadding={12}
        // The anchor moves without resizing, which the default strategy wouldn't notice.
        updatePositionStrategy={open ? "always" : "optimized"}
        onPointerDownOutside={onPointerDownOutside}
        data-instant={instant ? "" : undefined}
        className={cn("activity-tooltip z-50 max-w-[260px] rounded-[12px] px-3 py-2.5 text-[12px] leading-[1.5]", GLASS_CLASS)}
      >
        {tip ? (
          <>
            <p className="mb-1.5 text-[11px] font-medium text-[#6e6e73]">{tip.dateLabel}</p>
            <ul className="flex flex-col gap-0.5">
              {tip.lines.map((line, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span aria-hidden className={cn("size-[7px] shrink-0 rounded-full", DOT_TONE[line.tone])} />
                  <span className={TEXT_TONE[line.tone]}>{line.text}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
