import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import type { EventWindow } from "~/modules/profile/components/profile-tabs";
import { ProfileStatusPill } from "~/modules/profile/components/profile-status-pill";
import { profileCardClassName } from "~/modules/profile/components/profile-tokens";
import type { ProfileEvent } from "~/modules/profile/model/profile-event";
import { Routes } from "~/shared/lib/routing/routes";

function formatEventDate(startTime: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone || undefined,
  }).format(new Date(startTime));
}

export function ProfileEventsTable({ events, period }: { events: ProfileEvent[]; period: EventWindow }) {
  const [showPast, setShowPast] = useState(false);
  const now = useMemo(() => Date.now(), []);
  const { upcoming, past, visible } = useMemo(() => {
    const upcomingEvents = events
      .filter((event) => new Date(event.startTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const pastEvents = events
      .filter((event) => new Date(event.startTime).getTime() < now)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return {
      upcoming: upcomingEvents,
      past: pastEvents,
      visible: period === "upcoming" ? upcomingEvents : pastEvents,
    };
  }, [events, now, period]);

  return (
    <div>
      <div className={`${profileCardClassName} overflow-hidden`}>
        <div className="sm:hidden">
          {upcoming.length === 0 && past.length === 0 ? (
            <div className="px-5 py-10 text-center text-[15px] text-[#6e6e73]">No events.</div>
          ) : (
            <>
              {upcoming.length > 0 ? (
                <ul>
                  {upcoming.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-10 text-center text-[15px] text-[#6e6e73]">No upcoming events.</div>
              )}
              {showPast ? (
                <ul>
                  {past.map((event, index) => (
                    <EventRow key={event.id} event={event} muted stackIndex={index} />
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
        <div className="hidden sm:block">
        {visible.length === 0 ? (
          <div className="px-5 py-10 text-center text-[15px] text-[#6e6e73]">
            {period === "upcoming" ? "No upcoming events." : "No past events."}
          </div>
        ) : (
          <ul>
            {visible.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
        </div>
      </div>
      {past.length > 0 && !showPast ? (
        <button
          type="button"
          onClick={() => setShowPast(true)}
          className="mx-auto mt-3 block w-fit text-[13px] font-medium text-[#8c8e9a] outline-none transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/15 active:scale-[0.97] sm:hidden [@media(hover:hover)]:hover:text-[#6e6e73]"
        >
          Show past events
        </button>
      ) : null}
    </div>
  );
}

function EventCover({ event, muted = false }: { event: ProfileEvent; muted?: boolean }) {
  return (
    <span className="relative size-10 shrink-0 overflow-hidden rounded-[8px] bg-[#f3f3f4]">
      {event.coverUrl ? (
        <img src={event.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-[12px] font-semibold text-[#8c8e9a]">
          {event.title.slice(0, 1).toUpperCase()}
        </span>
      )}
      {muted ? <span aria-hidden className="absolute inset-0 bg-[#6e6e73]/35" /> : null}
    </span>
  );
}

function EventRow({
  event,
  muted = false,
  stackIndex,
}: {
  event: ProfileEvent;
  muted?: boolean;
  stackIndex?: number;
}) {
  const date = formatEventDate(event.startTime, event.timezone);

  return (
    <li
      className={`border-b border-black/[0.06] last:border-b-0 ${stackIndex === undefined ? "" : "profile-past-stack"}`}
      style={
        stackIndex === undefined
          ? undefined
          : ({ "--stack-delay": `${Math.min(stackIndex, 6) * 40}ms` } as CSSProperties)
      }
    >
      <Link
        to={Routes.community.event(event.communitySlug, event.eventSlug)}
        prefetch="intent"
        className="group flex items-center gap-3 px-4 py-3 outline-none transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#fafafa] focus-visible:bg-[#fafafa]"
      >
        <EventCover event={event} muted={muted} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-[#111]">{event.title}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[13px] text-[#6e6e73]">
            <span className="truncate">
              {event.communityName} · {date}
            </span>
            <span className="shrink-0">
              <ProfileStatusPill status={event.status} />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
