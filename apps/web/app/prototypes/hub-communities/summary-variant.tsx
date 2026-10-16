import { useState } from "react";
import { Link } from "react-router";
import type { CSSProperties } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Community } from "~/modules/hub/model/hub-types";
import { HubSectionHeader } from "~/modules/hub/components/v2/hub-section-header";
import { getRiseDelayMs } from "~/modules/hub/utils/get-rise-delay-ms";
import { cn } from "~/shared/lib/utils/cn";
import { CommunityLogo } from "./community-logo";
import { getCommunityHref } from "./get-community-href";
import verifiedBadge from "~/assets/images/hub-v2/verified-badge.svg";

type SummaryVariantProps = {
  communities: Community[];
};

const STACKED_LOGO_COUNT = 4;

/** Axis: progressive disclosure. One summary bar; the list opens in place on tap. */
export function SummaryVariant({ communities }: SummaryVariantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [first, second] = communities;
  const remaining = communities.length - 2;
  const preview =
    remaining > 0 ? `${first?.name}, ${second?.name} and ${remaining} more` : communities.map((c) => c.name).join(", ");

  return (
    <section aria-labelledby="proto-summary-heading" className="flex flex-col gap-5">
      <HubSectionHeader id="proto-summary-heading" title="Explore Communities" />
      <div className="animate-hub-rise rounded-[24px] bg-[#f6f6f6] p-1 shadow-[0px_16px_32px_-10px_rgba(0,0,0,0.1)]">
        <div className="overflow-hidden rounded-[20px] bg-white drop-shadow-[0px_4px_7px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="proto-summary-list"
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center gap-3 px-3.5 py-3 text-left outline-none transition-colors duration-150 ease-standard active:bg-[#f6f6f6] focus-visible:bg-[#f6f6f6]"
          >
            <span className="flex shrink-0">
              {communities.slice(0, STACKED_LOGO_COUNT).map((community, index) => (
                <CommunityLogo
                  key={community.id}
                  community={community}
                  className={cn("size-9 rounded-[10px] ring-2 ring-white", index > 0 && "-ml-3")}
                />
              ))}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[15px] font-medium leading-tight text-[#111]">
                {communities.length} communities
              </span>
              <span className="truncate text-[13px] leading-tight text-[rgba(17,17,17,0.5)]">{preview}</span>
            </span>
            <ChevronDown
              className={cn(
                "size-[18px] shrink-0 text-[#8c8e9a] transition-transform duration-200 ease-out-strong",
                isOpen && "rotate-180",
              )}
              strokeWidth={2}
              aria-hidden
            />
          </button>

          {isOpen && (
            <ul id="proto-summary-list" className="divide-y divide-[#f1f1f3] border-t border-[#f1f1f3]">
              {communities.map((community, index) => (
                <li
                  key={community.id}
                  className="animate-hub-rise"
                  style={{ "--rise-delay": `${getRiseDelayMs(index)}ms` } as CSSProperties}
                >
                  <Link
                    to={getCommunityHref(community)}
                    prefetch="intent"
                    data-hub-control
                    className="flex items-center gap-3 px-3.5 py-3 outline-none transition-colors duration-150 ease-standard active:bg-[#f6f6f6] focus-visible:bg-[#f6f6f6]"
                  >
                    <CommunityLogo community={community} className="size-9 rounded-[10px]" />
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
          )}
        </div>
      </div>
    </section>
  );
}
