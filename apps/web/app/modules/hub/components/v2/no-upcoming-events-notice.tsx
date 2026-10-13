import { CalendarOff } from "lucide-react";

export function NoUpcomingEventsNotice() {
  return (
    <p className="animate-hub-rise flex items-center gap-2 text-[14px] leading-none text-[#8c8e9a]">
      <CalendarOff className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      No upcoming events right now.
    </p>
  );
}
