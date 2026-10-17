import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "~/shared/lib/utils/cn";
import searchIcon from "~/assets/images/hub/search.svg";

type HubSearchFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function HubSearchField({ value, onValueChange, className }: HubSearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <label
      className={cn(
        "group/search flex h-11 min-w-0 cursor-text items-center gap-2 overflow-hidden rounded-[44px] bg-[#f6f6f6] pl-4 pr-[14px]",
        "shadow-[inset_0_0_0_1px_transparent] transition-[background-color,box-shadow] duration-200 ease-out-strong",
        "hover:bg-[#f1f1f1] focus-within:bg-white focus-within:shadow-[inset_0_0_0_1px_rgba(17,17,17,0.12),0_6px_18px_-8px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      <span className="relative flex size-[20px] shrink-0 items-center justify-center">
        <img
          src={searchIcon}
          alt=""
          width={17.8667}
          height={17.8667}
          className="block max-w-none -scale-x-100"
        />
      </span>
      <span className="sr-only">Search communities and events</span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onValueChange("");
            event.currentTarget.blur();
          }
        }}
        placeholder="Search"
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-medium leading-normal md:text-[14px] md:font-normal text-[#111] outline-none placeholder:text-[#8c8e9a] [&::-webkit-search-cancel-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Clear search"
        aria-hidden={!hasValue}
        tabIndex={hasValue ? 0 : -1}
        onClick={() => {
          onValueChange("");
          inputRef.current?.focus();
        }}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e9e9ec] text-[#5f616b]",
          "transition-[opacity,transform] duration-200 ease-out-strong active:scale-[0.92]",
          hasValue ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
        )}
      >
        <X className="size-3.5" strokeWidth={2.25} />
      </button>
    </label>
  );
}
