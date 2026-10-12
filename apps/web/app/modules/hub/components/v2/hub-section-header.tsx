import { cn } from "~/shared/lib/utils/cn";

type HubSectionHeaderProps = {
  id: string;
  title: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  controlsId?: string;
};

const labelLayer =
  "col-start-1 row-start-1 transition-[opacity,filter,transform] duration-200 ease-out-strong";

export function HubSectionHeader({
  id,
  title,
  isExpanded = false,
  onToggle,
  controlsId,
}: HubSectionHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between gap-4 leading-none">
      <h2 id={id} className="text-[24px] font-semibold leading-none text-[#111] sm:text-[26px]">
        {title}
      </h2>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={controlsId}
          className={cn(
            "-mx-2 -my-1 rounded-full px-2 py-1 text-[16px] font-medium leading-none text-[#888] sm:text-[14px]",
            "transition-[color,transform] duration-150 ease-out-strong hover:text-[#111] active:scale-[0.96]",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#111]/15",
          )}
        >
          <span className="grid justify-items-end">
            <span
              aria-hidden={isExpanded}
              className={cn(labelLayer, isExpanded && "translate-y-[-3px] opacity-0 blur-[2px]")}
            >
              See all
            </span>
            <span
              aria-hidden={!isExpanded}
              className={cn(labelLayer, !isExpanded && "translate-y-[3px] opacity-0 blur-[2px]")}
            >
              Show less
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
