import {
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ProfileActivityTooltip } from "~/modules/profile/components/profile-activity-tooltip";
import { activityLevelClassName, profileCardClassName } from "~/modules/profile/components/profile-tokens";
import {
  activityMonthLabels,
  activityTooltip,
  toActivityCells,
  type ActivityCell,
  type ActivityWindow,
  type ProfileActivity,
} from "~/modules/profile/model/profile-activity";
import { cn } from "~/shared/lib/utils/cn";

// Delays, not animations. The motion itself lives in app.css (docs/profile-activity.md §7.3, §8).
const OPEN_DELAY_MS = 200;
const CLOSE_GRACE_MS = 80;
const INSTANT_REOPEN_MS = 400;

const GRID_CLASS = "grid grid-cols-[repeat(52,minmax(0,1fr))] gap-[3px]";
const DOT_CLASS = "block aspect-square w-full rounded-full";

const KEY_STEP: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };

export function ActivityCardShell({ busy = false, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <section aria-busy={busy || undefined} className={cn(profileCardClassName, "overflow-hidden p-4")}>
      <h2 className="text-[13px] font-medium text-[#6e6e73]">Activity</h2>
      {children}
    </section>
  );
}

const MonthRow = memo(function MonthRow({ range }: { range: ActivityWindow }) {
  const labels = useMemo(() => activityMonthLabels(range), [range]);
  return (
    <div aria-hidden className={cn(GRID_CLASS, "text-[11px] leading-none text-[#8c8e9a]")}>
      {labels.map((label) => (
        <span key={label.column} className="row-start-1 whitespace-nowrap" style={{ gridColumnStart: label.column + 1 }}>
          {label.label}
        </span>
      ))}
    </div>
  );
});

/** Every slot as an empty dot. Shared by the skeleton and the loaded card, so the switch never repaints it. */
const BaseDots = memo(function BaseDots({ range, pulse }: { range: ActivityWindow; pulse: boolean }) {
  const slots = useMemo(() => toActivityCells({ timezone: range.timezone, days: [] }, range), [range]);
  return (
    <div aria-hidden className={cn(GRID_CLASS, "grid-flow-col grid-rows-7", pulse && "activity-skeleton-pulse")}>
      {slots.map((slot, index) =>
        slot ? (
          <span key={index} data-i={index} className={cn(DOT_CLASS, activityLevelClassName[0])} />
        ) : (
          <span key={index} />
        ),
      )}
    </div>
  );
});

/** Only the active days, placed explicitly over the base layer. One element to reveal, usually far fewer than 364 dots. */
const ColourDots = memo(function ColourDots({ cells }: { cells: ActivityCell[] }) {
  return (
    <div aria-hidden className={cn(GRID_CLASS, "activity-reveal pointer-events-none absolute inset-0 grid-rows-7")}>
      {cells.map((cell) => (
        <span
          key={cell.date}
          className={cn(DOT_CLASS, activityLevelClassName[cell.level])}
          style={{ gridColumnStart: cell.column + 1, gridRowStart: cell.row + 1 }}
        />
      ))}
    </div>
  );
});

type ActivityGridFrameProps = {
  range: ActivityWindow;
  pulse?: boolean;
  wrapperRef?: Ref<HTMLDivElement>;
  wrapperProps?: HTMLAttributes<HTMLDivElement>;
  children?: ReactNode;
};

/** Month labels and the base layer. Narrow screens scroll sideways, starting at today. */
export function ActivityGridFrame({ range, pulse = false, wrapperRef, wrapperProps, children }: ActivityGridFrameProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    // Today stays on the right edge, including after the card width changes.
    const pinToToday = () => {
      scroller.scrollLeft = scroller.scrollWidth;
    };

    pinToToday();
    const observer = new ResizeObserver(pinToToday);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={scrollRef}
      className="mt-2.5 overflow-x-auto [scrollbar-width:none] sm:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      <div className="min-w-[620px] sm:min-w-0">
        <MonthRow range={range} />
        <div
          ref={wrapperRef}
          {...wrapperProps}
          className={cn("relative mt-1.5 rounded-[4px] outline-none", wrapperProps?.className)}
        >
          <BaseDots range={range} pulse={pulse} />
          {children}
        </div>
      </div>
    </div>
  );
}

function indexFromTarget(target: EventTarget) {
  const dot = (target as HTMLElement).closest?.("[data-i]");
  const value = dot?.getAttribute("data-i");
  return value == null ? null : Number(value);
}

type ProfileActivityGridProps = {
  activity: ProfileActivity;
  range: ActivityWindow;
  describedBy: string;
};

export function ProfileActivityGrid({ activity, range, describedBy }: ProfileActivityGridProps) {
  const cells = useMemo(() => toActivityCells(activity, range), [activity, range]);
  const coloured = useMemo(
    () => cells.filter((cell): cell is ActivityCell => cell !== null && cell.level > 0),
    [cells],
  );
  const dayByDate = useMemo(() => new Map(activity.days.map((day) => [day.day, day])), [activity]);
  const lastIndex = useMemo(() => {
    let last = 0;
    cells.forEach((cell, index) => {
      if (cell) last = index;
    });
    return last;
  }, [cells]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastClosedAt = useRef(0);

  const [active, setActive] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const [anchor, setAnchor] = useState<CSSProperties>();

  useLayoutEffect(() => {
    if (active === null) return;
    const dot = wrapperRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    if (!dot) return;
    setAnchor({ left: dot.offsetLeft, top: dot.offsetTop, width: dot.offsetWidth, height: dot.offsetHeight });
  }, [active]);

  function openNow(skipAnimation: boolean) {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    if (openRef.current) return;
    openRef.current = true;
    setInstant(skipAnimation);
    setOpen(true);
  }

  function close() {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    if (!openRef.current) return;
    openRef.current = false;
    lastClosedAt.current = Date.now();
    setOpen(false);
    setInstant(false);
  }

  function reopensInstantly() {
    return Date.now() - lastClosedAt.current < INSTANT_REOPEN_MS;
  }

  function handlePointerOver(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const index = indexFromTarget(event.target);
    if (index === null) return;
    setActive(index);
    window.clearTimeout(closeTimer.current);
    if (openRef.current) return;

    window.clearTimeout(openTimer.current);
    const skipAnimation = reopensInstantly();
    openTimer.current = window.setTimeout(() => openNow(skipAnimation), skipAnimation ? 0 : OPEN_DELAY_MS);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(close, CLOSE_GRACE_MS);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") return;
    const index = indexFromTarget(event.target);
    if (index === null) return;
    setActive(index);
    openNow(reopensInstantly());
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.matches(":focus-visible")) return;
    setActive((current) => current ?? lastIndex);
    openNow(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      close();
      return;
    }

    let next: number | null = null;
    if (event.key in KEY_STEP) next = (active ?? lastIndex) + KEY_STEP[event.key];
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = lastIndex;
    if (next === null) return;

    event.preventDefault();
    setActive(Math.min(Math.max(next, 0), lastIndex));
    openNow(true);
  }

  const activeCell = active === null ? null : cells[active];
  const tip = activeCell ? activityTooltip(activeCell.date, dayByDate.get(activeCell.date), range.today) : null;

  return (
    <ActivityGridFrame
      range={range}
      wrapperRef={wrapperRef}
      wrapperProps={{
        tabIndex: 0,
        role: "group",
        "aria-label": "Activity over the last year",
        "aria-describedby": describedBy,
        onPointerOver: handlePointerOver,
        onPointerLeave: handlePointerLeave,
        onPointerDown: handlePointerDown,
        onFocus: handleFocus,
        onBlur: close,
        onKeyDown: handleKeyDown,
        className: "focus-visible:ring-2 focus-visible:ring-[#111]/15 focus-visible:ring-offset-4",
      }}
    >
      <ColourDots cells={coloured} />
      <TooltipPrimitive.Provider delayDuration={0}>
        <TooltipPrimitive.Root open={open} onOpenChange={(next) => !next && close()}>
          <TooltipPrimitive.Trigger asChild>
            {/* The single anchor: sits over the active dot and draws its ring (motion inventory M8: no animation). */}
            <span
              aria-hidden
              className={cn("pointer-events-none absolute rounded-full ring-2 ring-primary/50", !open && "opacity-0")}
              style={anchor}
            />
          </TooltipPrimitive.Trigger>
          <ProfileActivityTooltip
            tip={tip}
            open={open}
            instant={instant}
            onPointerDownOutside={(event) => {
              // Tapping another dot moves the tooltip instead of dismissing it.
              if (wrapperRef.current?.contains(event.target as Node)) event.preventDefault();
            }}
          />
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
      <p className="sr-only" aria-live="polite">
        {open && tip ? `${tip.dateLabel}: ${tip.lines.map((line) => line.text).join(", ")}` : ""}
      </p>
    </ActivityGridFrame>
  );
}
