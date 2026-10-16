import { Link } from "react-router";
import type { CSSProperties } from "react";
import type { Community } from "~/modules/hub/model/hub-types";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
import { getRiseDelayMs } from "~/modules/hub/utils/get-rise-delay-ms";
import { CommunityLogo } from "./community-logo";
import { getCommunityHref } from "./get-community-href";
import verifiedBadge from "~/assets/images/hub-v2/verified-badge.svg";

type RailVariantProps = {
  communities: Community[];
};

/** Axis: layout. One swipeable row of compact cards; the next card peeks in. */
export function RailVariant({ communities }: RailVariantProps) {
  return (
    <section aria-labelledby="proto-rail-heading" className="flex flex-col gap-5">
      <HubSectionHeader id="proto-rail-heading" title="Explore Communities" />
      <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {communities.map((community, index) => (
          <Link
            key={community.id}
            to={getCommunityHref(community)}
            prefetch="intent"
            data-hub-control
            style={{ "--rise-delay": `${getRiseDelayMs(index)}ms` } as CSSProperties}
            className="animate-hub-rise group w-[78%] max-w-[300px] shrink-0 snap-start rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-[#111]/20"
          >
            <div className="h-full rounded-[22px] bg-[#f6f6f6] p-1 shadow-[0px_12px_24px_-12px_rgba(0,0,0,0.12)] [transition:background-color_200ms_var(--ease-standard),transform_150ms_var(--ease-out-strong)] group-active:scale-[0.98]">
              <div className="flex h-full items-start gap-3 rounded-[19px] bg-white p-3.5 drop-shadow-[0px_4px_7px_rgba(0,0,0,0.05)]">
                <CommunityLogo community={community} className="size-11 rounded-[10px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate text-[15px] font-medium leading-tight text-[#111]">
                      {community.name}
                    </h3>
                    {community.verified && (
                      <img src={verifiedBadge} alt="Verified" width={16} height={16} className="block max-w-none shrink-0" />
                    )}
                  </div>
                  <p className="line-clamp-2 text-[13px] leading-[1.4] text-[rgba(17,17,17,0.5)]">
                    {community.description || community.tagline}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
