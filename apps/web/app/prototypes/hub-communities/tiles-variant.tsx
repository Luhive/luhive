import { Link } from "react-router";
import type { CSSProperties } from "react";
import type { Community } from "~/modules/hub/model/hub-types";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
import { useSectionExpansion } from "~/modules/hub/hooks/use-section-expansion";
import { getRiseDelayMs } from "~/modules/hub/utils/get-rise-delay-ms";
import { CommunityLogo } from "./community-logo";
import { getCommunityHref } from "./get-community-href";
import { formatMemberCount } from "./sample-communities";
import verifiedBadge from "~/assets/images/hub-v2/verified-badge.svg";

type TilesVariantProps = {
  communities: Community[];
};

const PREVIEW_COUNT = 4;

/** Axis: two-column grid. Small tiles, two rows visible, the rest behind See all. */
export function TilesVariant({ communities }: TilesVariantProps) {
  const { sectionRef, isExpanded, toggle } = useSectionExpansion<HTMLElement>();
  const visible = isExpanded ? communities : communities.slice(0, PREVIEW_COUNT);

  return (
    <section ref={sectionRef} aria-labelledby="proto-tiles-heading" className="flex scroll-mt-6 flex-col gap-5">
      <HubSectionHeader
        id="proto-tiles-heading"
        title="Explore Communities"
        isExpanded={isExpanded}
        onToggle={communities.length > PREVIEW_COUNT ? toggle : undefined}
        controlsId="proto-tiles"
      />
      <div id="proto-tiles" className="grid grid-cols-2 gap-2.5">
        {visible.map((community, index) => (
          <Link
            key={community.id}
            to={getCommunityHref(community)}
            prefetch="intent"
            data-hub-control
            style={{ "--rise-delay": `${getRiseDelayMs(index < PREVIEW_COUNT ? index : index - PREVIEW_COUNT)}ms` } as CSSProperties}
            className="animate-hub-rise group rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-[#111]/20"
          >
            <div className="h-full rounded-[20px] bg-[#f6f6f6] p-1 shadow-[0px_12px_24px_-12px_rgba(0,0,0,0.12)] transition-transform duration-150 ease-out-strong group-active:scale-[0.97]">
              <div className="flex h-full flex-col gap-3 rounded-[17px] bg-white p-3 drop-shadow-[0px_4px_7px_rgba(0,0,0,0.05)]">
                <CommunityLogo community={community} className="size-10 rounded-[10px]" />
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <h3 className="truncate text-[14px] font-medium leading-tight text-[#111]">
                      {community.name}
                    </h3>
                    {community.verified && (
                      <img src={verifiedBadge} alt="Verified" width={16} height={16} className="block max-w-none shrink-0" />
                    )}
                  </div>
                  <p className="text-[12px] leading-tight text-[#8c8e9a]">
                    {formatMemberCount(community.memberCount)}
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
