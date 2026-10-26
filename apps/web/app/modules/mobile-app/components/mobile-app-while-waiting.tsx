import { Link } from "react-router";
import { ArrowRight, Video } from "lucide-react";
import type { HubEventSummary } from "~/modules/hub/model/hub-types";
import { ExploreCommunityCard } from "~/modules/hub/components/explore-community-card";
import {
  formatEventDateLabel,
  formatEventTimeRange,
} from "~/modules/hub/utils/format-event-schedule";
import type { WhileWaiting } from "~/modules/mobile-app/server/mobile-app-waiting.server";
import * as MobileAppAnalytics from "~/modules/mobile-app/utils/mobile-app-analytics";
import { Routes } from "~/shared/lib/routing/routes";
import locationPin from "~/assets/images/hub/location-pin.svg";

const ITEM_WIDTH = "w-full sm:w-[calc(50%-7px)] lg:w-[calc((100%-28px)/3)]";

/**
 * Last section of /app: something to do on Luhive today. The next three upcoming events
 * (the hub's own view), or, with none scheduled, the three most active communities to
 * join (the hub's own card). Then a way into the hub.
 */
export function MobileAppWhileWaiting({ waiting }: { waiting: WhileWaiting }) {
  const hasEvents = waiting.kind === "events";

  return (
    <section aria-labelledby="app-waiting" className="bg-[#F6F4F1] py-16 md:py-24">
      <div className="mx-auto w-[90vw] max-w-[70rem]">
        <header className="mb-12 flex flex-col items-center gap-4 text-center md:mb-16">
          <h2
            id="app-waiting"
            className="text-3xl font-medium leading-tight tracking-tight text-[#141414] md:text-[3rem]"
          >
            While you are waiting
          </h2>
          <p className="max-w-xl text-md leading-[1.44] text-[#666661]">
            {hasEvents
              ? "These are coming up on Luhive, and you can register in the browser today."
              : "Join a community now and you will hear about their next event first."}
          </p>
        </header>

        {/* Flex, not grid, so one or two items still sit centred under the heading. */}
        <ul className="flex w-full flex-wrap justify-center gap-[14px]">
          {waiting.kind === "events"
            ? waiting.events.map((event) => (
                <li key={event.id} className={ITEM_WIDTH}>
                  <WaitingEventCard event={event} />
                </li>
              ))
            : waiting.communities.map((community) => (
                <li
                  key={community.id}
                  className={ITEM_WIDTH}
                  onClickCapture={() => MobileAppAnalytics.trackWaitingClicked("community")}
                >
                  <ExploreCommunityCard community={community} riseDelayMs={0} />
                </li>
              ))}
        </ul>

        <div className="mt-10 flex justify-center">
          {/* A text button, like "Add another email": secondary to the cards above. */}
          <Link
            to={Routes.hub}
            prefetch="intent"
            onClick={() => MobileAppAnalytics.trackWaitingClicked("explore")}
            className="waitlist-press group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-base font-medium text-primary hover:bg-primary/[0.06]"
          >
            Explore more on the Hub
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * The hub's event card, minus its preview drawer (that lives on /hub): a plain link to
 * the event page with the same cover, date, title and place.
 */
function WaitingEventCard({ event }: { event: HubEventSummary }) {
  return (
    <Link
      to={Routes.community.event(event.communitySlug, event.slug)}
      prefetch="intent"
      onClick={() => MobileAppAnalytics.trackWaitingClicked("event")}
      className="group flex min-w-0 flex-col gap-4 rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#111]/20 focus-visible:ring-offset-4"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[12px] bg-[#f6f6f6] transition-transform duration-150 ease-out-strong group-active:scale-[0.98]">
        {event.coverUrl ? (
          <img
            src={event.coverUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out-strong group-hover:scale-[1.035]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f6f6f6] to-[#ececef] p-4 text-center text-[15px] font-medium text-[#8c8e9a]">
            {event.communityName}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3 text-left">
        <p className="flex min-w-0 items-center whitespace-nowrap text-[14px] leading-[1.44] text-[#8c8e9a]">
          <span>{formatEventDateLabel(event.startTime, event.timezone)}</span>
          <span aria-hidden className="mx-[7px] text-[10px]">
            •
          </span>
          <span className="truncate">
            {formatEventTimeRange(event.startTime, event.endTime, event.timezone)}
          </span>
        </p>
        <h3 className="truncate text-[20px] font-medium leading-normal text-[#111]">
          {event.title}
        </h3>
        <p className="flex min-w-0 items-center gap-1 text-[14px] leading-normal text-[#8c8e9a]">
          {event.isOnline ? (
            <>
              <Video className="size-[13px] shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="truncate">Online · {event.communityName}</span>
            </>
          ) : (
            <>
              {event.locationName && (
                <img src={locationPin} alt="" width={11} height={13} className="shrink-0" />
              )}
              <span className="truncate">
                {event.locationName ? `${event.locationName} · ` : ""}
                {event.communityName}
              </span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
