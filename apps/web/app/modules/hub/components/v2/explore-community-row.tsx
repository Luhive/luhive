import { Link } from "react-router";
import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import type { Community } from "~/modules/hub/model/hub-types";
import { CommunityLogo } from "~/modules/hub/components/v2/community-logo";
import { getCommunityHref } from "~/modules/hub/utils/get-community-href";
import verifiedBadge from "~/assets/images/hub-v2/verified-badge.svg";

type ExploreCommunityRowProps = {
  community: Community;
  riseDelayMs: number;
};

export function ExploreCommunityRow({ community, riseDelayMs }: ExploreCommunityRowProps) {
  return (
    <li className="animate-hub-rise" style={{ "--rise-delay": `${riseDelayMs}ms` } as CSSProperties}>
      <Link
        to={getCommunityHref(community)}
        prefetch="intent"
        viewTransition
        data-hub-control
        className="flex items-center gap-3 px-3.5 py-3 outline-none transition-colors duration-150 ease-standard active:bg-[#f6f6f6] focus-visible:bg-[#f6f6f6]"
      >
        <CommunityLogo name={community.name} logoUrl={community.logo_url} className="size-10 rounded-[10px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-[15px] font-medium leading-tight text-[#111]">{community.name}</h3>
            {community.verified && (
              <img src={verifiedBadge} alt="Verified" width={16} height={16} className="block max-w-none shrink-0" />
            )}
          </div>
          {(community.description || community.tagline) && (
            <p className="truncate text-[13px] leading-tight text-[rgba(17,17,17,0.5)]">
              {community.description || community.tagline}
            </p>
          )}
        </div>
        <ChevronRight className="size-4 shrink-0 text-[#b4b5bc]" strokeWidth={2} aria-hidden />
      </Link>
    </li>
  );
}
