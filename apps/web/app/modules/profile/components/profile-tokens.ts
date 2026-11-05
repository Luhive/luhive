export const profileCardClassName =
  "rounded-[16px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]";

export const profilePressClassName =
  "transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] [@media(hover:hover)]:hover:bg-black/[0.04]";

export const profilePrimaryButtonClassName =
  "inline-flex h-9 items-center justify-center rounded-full bg-[#111] px-4 text-[13px] font-medium text-white outline-none transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#2a2a2a] focus-visible:ring-2 focus-visible:ring-[#111]/20 active:scale-[0.97]";

export const profileTextButtonClassName =
  "inline-flex items-center px-4 py-3 text-[13px] font-medium text-[#111] outline-none transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/15 active:scale-[0.97] [@media(hover:hover)]:hover:text-[#6e6e73]";

export const profileSecondaryButtonClassName =
  "inline-flex h-9 items-center justify-center rounded-full border border-black/[0.08] bg-white px-4 text-[13px] font-medium text-[#111] outline-none transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/15 active:scale-[0.97] [@media(hover:hover)]:hover:bg-black/[0.04]";

export const profileFieldClassName =
  "h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[14px] text-[#111] outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

export const profileLabelClassName = "text-[13px] font-medium text-[#6e6e73]";

/** Indexed by `ActivityLevel`: empty, one action, several actions, an event day. */
export const activityLevelClassName = ["bg-[#ececee]", "bg-[#FFD3BC]", "bg-[#FF9A66]", "bg-primary"] as const;

export function profileRiseStyle(index: number): { className: string; style?: { "--rise-delay": string } } {
  if (index >= 6) return { className: "" };
  return {
    className: "animate-hub-rise",
    style: { "--rise-delay": `${index * 40}ms` },
  };
}
