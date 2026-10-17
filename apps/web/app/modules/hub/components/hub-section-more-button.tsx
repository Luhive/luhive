import { ChevronDown } from "lucide-react";
import { cn } from "~/shared/lib/utils/cn";

type HubSectionMoreButtonProps = {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  controlsId: string;
};

/** Phone-only "See all" placed under a section, where the thumb already is. */
export function HubSectionMoreButton({ label, isExpanded, onToggle, controlsId }: HubSectionMoreButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={controlsId}
      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[44px] bg-[#f6f6f6] text-[14px] font-medium text-[#5f616b] outline-none [transition:background-color_200ms_var(--ease-standard),transform_150ms_var(--ease-out-strong)] hover:bg-[#efefef] active:scale-[0.98] sm:hidden"
    >
      {isExpanded ? "Show less" : label}
      <ChevronDown
        className={cn(
          "size-4 transition-transform duration-200 ease-out-strong",
          isExpanded && "rotate-180",
        )}
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
}
