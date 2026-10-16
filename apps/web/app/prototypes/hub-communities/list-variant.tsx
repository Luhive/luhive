import { Link } from "react-router";
import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import type { Community } from "~/modules/hub/model/hub-types";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
import { useSectionExpansion } from "~/modules/hub/hooks/use-section-expansion";
import { getRiseDelayMs } from "~/modules/hub/utils/get-rise-delay-ms";
import { CommunityLogo } from "./community-logo";
import { getCommunityHref } from "./get-community-href";
import verifiedBadge from "~/assets/images/hub-v2/verified-badge.svg";

type ListVariantProps = {
  communities: Community[];
};

const PREVIEW_COUNT = 4;

/** Axis: density. A grouped list of slim rows, four visible, the rest behind See all. */
export function ListVariant({ communities }: ListVariantProps) {
  const { sectionRef, isExpanded, toggle } = useSectionExpansion<HTMLElement>();
  const visible = isExpanded ? communities : communities.slice(0, PREVIEW_COUNT);

  return (
    <section ref={sectionRef} aria-labelledby="proto-list-heading" className="flex scroll-mt-6 flex-col gap-5">
      <HubSectionHeader
        id="proto-list-heading"
        title="Explore Communities"
        isExpanded={isExpanded}
        onToggle={communities.length > PREVIEW_COUNT ? toggle : undefined}
        controlsId="proto-list"
      />
      <div className="rounded-[24px] bg-[#f6f6f6] p-1 shadow-[0px_16px_32px_-10px_rgba(0,0,0,0.1)]">
        <ul
          id="proto-list"
          className="divide-y divide-[#f1f1f3] overflow-hidden rounded-[20px] bg-white drop-shadow-[0px_4px_7px_rgba(0,0,0,0.05)]"
        >
          {visible.map((community, index) => (
            <li
              key={community.id}
              className="animate-hub-rise"
              style={{ "--rise-delay": `${getRiseDelayMs(index < PREVIEW_COUNT ? index : index - PREVIEW_COUNT)}ms` } as CSSProperties}
            >
              <Link
                to={getCommunityHref(community)}
                prefetch="intent"
                data-hub-control
                className="flex items-center gap-3 px-3.5 py-3 outline-none transition-colors duration-150 ease-standard active:bg-[#f6f6f6] focus-visible:bg-[#f6f6f6]"
              >
                <CommunityLogo community={community} className="size-10 rounded-[10px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate text-[15px] font-medium leading-tight text-[#111]">
                      {community.name}
                    </h3>
                    {community.verified && (
                      <img src={verifiedBadge} alt="Verified" width={16} height={16} className="block max-w-none shrink-0" />
                    )}
                  </div>
                  <p className="truncate text-[13px] leading-tight text-[rgba(17,17,17,0.5)]">
                    {community.description || community.tagline}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-[#b4b5bc]" strokeWidth={2} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
