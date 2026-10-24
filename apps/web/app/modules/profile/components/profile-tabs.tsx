import type { ReactNode } from "react";
import { CalendarClock, CalendarDays, History, Users } from "lucide-react";
import { ProfileSegmentedControl } from "~/modules/profile/components/profile-segmented-control";
export type ProfileTab = "communities" | "events";

const TABS: { id: ProfileTab; label: string; icon: ReactNode }[] = [
  { id: "communities", label: "Communities", icon: <Users className="size-4" aria-hidden /> },
  { id: "events", label: "Events", icon: <CalendarDays className="size-4" aria-hidden /> },
];

export type EventWindow = "upcoming" | "past";

type ProfileTabsProps = {
  value: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  eventWindow: EventWindow;
  onEventWindowChange: (window: EventWindow) => void;
};

export function ProfileTabs({ value, onChange, eventWindow, onEventWindowChange }: ProfileTabsProps) {
  const nextWindow = eventWindow === "upcoming" ? "past" : "upcoming";

  const WindowIcon = eventWindow === "upcoming" ? CalendarClock : History;

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <ProfileSegmentedControl label="Profile sections" segments={TABS} value={value} onChange={onChange} />
      {value === "events" ? (
        <button
          type="button"
          aria-pressed={eventWindow === "past"}
          onClick={() => onEventWindowChange(nextWindow)}
          className="hidden h-8 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-black/[0.08] bg-white px-3 text-[13px] font-medium text-[#111] outline-none transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/15 active:scale-[0.97] sm:inline-flex"
        >
          <span
            key={eventWindow}
            className={`inline-flex items-center gap-1.5 ${eventWindow === "past" ? "profile-window-swap-up" : "profile-window-swap-down"}`}
          >
            <WindowIcon className="size-3.5" aria-hidden />
            {eventWindow === "upcoming" ? "Upcoming" : "Past"}
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function parseProfileTab(value: string | null): ProfileTab {
  if (value === "events") return value;
  return "communities";
}
