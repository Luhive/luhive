import { Link } from "react-router";
import type { CSSProperties } from "react";
import type { Community } from "~/modules/hub/model/hub-types";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
import { getRiseDelayMs } from "~/modules/hub/utils/get-rise-delay-ms";
import { CommunityLogo } from "./community-logo";
import { getCommunityHref } from "./get-community-href";
import verifiedBadge from "~/assets/images/hub-v2/verified-badge.svg";

type StripVariantProps = {
  communities: Community[];
};

/** Axis: glanceability. A stories-style row of logos with names; smallest footprint. */
export function StripVariant({ communities }: StripVariantProps) {
  return (
    <section aria-labelledby="proto-strip-heading" className="flex flex-col gap-4">
      <HubSectionHeader id="proto-strip-heading" title="Explore Communities" />
      <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto overscroll-x-contain px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {communities.map((community, index) => (
          <Link
            key={community.id}
            to={getCommunityHref(community)}
            prefetch="intent"
            data-hub-control
            aria-label={community.name}
            style={{ "--rise-delay": `${getRiseDelayMs(index)}ms` } as CSSProperties}
            className="animate-hub-rise group flex w-[78px] shrink-0 snap-start flex-col items-center gap-2 rounded-[18px] py-1 outline-none focus-visible:ring-2 focus-visible:ring-[#111]/20"
          >
            <span className="relative rounded-[22px] bg-[#f6f6f6] p-[3px] shadow-[0px_10px_20px_-12px_rgba(0,0,0,0.18)] transition-transform duration-150 ease-out-strong group-active:scale-[0.95]">
              <CommunityLogo community={community} className="size-16 rounded-[19px]" />
              {community.verified && (
                <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
                  <img src={verifiedBadge} alt="" width={16} height={16} className="block max-w-none" />
                </span>
              )}
            </span>
            <span className="line-clamp-2 w-full text-center text-[12px] font-medium leading-[1.25] text-[#3f4049]">
              {community.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
