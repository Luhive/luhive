import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "~/shared/lib/utils/cn";

type Segment<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

type ProfileSegmentedControlProps<T extends string> = {
  label: string;
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Sits inside a shared track instead of drawing its own. */
  plain?: boolean;
};

type Indicator = {
  x: number;
  width: number;
};

export function ProfileSegmentedControl<T extends string>({
  label,
  segments,
  value,
  onChange,
  plain = false,
}: ProfileSegmentedControlProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef(false);
  const hasPositioned = useRef(false);
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const [shouldSlide, setShouldSlide] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function placeIndicator(animate: boolean) {
      const active = list?.querySelector<HTMLElement>("[data-active='true']");
      if (!active) return;
      setIndicator({ x: active.offsetLeft, width: active.offsetWidth });
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!hasPositioned.current || snapRef.current || reduced || !animate) {
        hasPositioned.current = true;
        snapRef.current = false;
        setShouldSlide(false);
        return;
      }
      setShouldSlide(true);
    }

    placeIndicator(true);
    const observer = new ResizeObserver(() => placeIndicator(false));
    observer.observe(list);
    return () => observer.disconnect();
  }, [value, segments]);

  function move(direction: 1 | -1) {
    const index = segments.findIndex((segment) => segment.id === value);
    const next = segments[index + direction];
    if (!next) return;
    snapRef.current = true;
    onChange(next.id);
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn(
        "relative inline-flex w-fit self-start",
        plain ? "" : "rounded-[10px] bg-black/[0.04] p-[3px]",
      )}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {indicator ? (
        <span
          aria-hidden
          className={cn(
            plain
              ? "pointer-events-none absolute inset-y-0 left-0 rounded-[8px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              : "pointer-events-none absolute top-[3px] left-0 h-[calc(100%-6px)] rounded-[8px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
            shouldSlide && "transition-[transform,width] duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
          )}
          style={{ width: indicator.width, transform: `translateX(${indicator.x}px)` }}
        />
      ) : null}
      {segments.map((segment) => {
        const isActive = segment.id === value;
        return (
          <button
            key={segment.id}
            type="button"
            role="tab"
            data-active={isActive}
            aria-selected={isActive}
            aria-label={segment.label}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(segment.id)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium outline-none transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/15 active:scale-[0.97]",
              isActive ? "text-[#111]" : "text-[#6e6e73]",
            )}
          >
            {segment.icon}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
