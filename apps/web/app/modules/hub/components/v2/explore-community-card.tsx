import { Link } from "react-router";
import type { CSSProperties } from "react";
import type { Community } from "~/modules/hub/model/hub-types";
import { Routes } from "~/shared/lib/routing/routes";
import arrowUpRight from "~/assets/images/hub-v2/arrow-up-right.svg";
import verifiedBadge from "~/assets/images/hub-v2/verified-badge.svg";

type ExploreCommunityCardProps = {
  community: Community;
  riseDelayMs: number;
};

export function ExploreCommunityCard({ community, riseDelayMs }: ExploreCommunityCardProps) {
  const href = community.isAdmin
    ? Routes.dashboard.overview(community.slug)
    : Routes.community.detail(community.slug);
  const summary = community.description || community.tagline;

  return (
    <Link
      to={href}
      prefetch="intent"
      viewTransition
      style={{ "--rise-delay": `${riseDelayMs}ms` } as CSSProperties}
      className="animate-hub-rise group block h-full rounded-[26px] outline-none focus-visible:ring-2 focus-visible:ring-[#111]/20 focus-visible:ring-offset-2"
    >
      <div className="flex h-full flex-col overflow-clip rounded-[26px] bg-[#f6f6f6] p-1 shadow-[0px_16px_32px_-10px_rgba(0,0,0,0.1)] transition-[transform,background-color] duration-200 ease-out group-hover:bg-[#ececee] group-active:scale-[0.985] group-active:duration-150">
        <div className="flex flex-1 flex-col gap-[34px] rounded-[24px] bg-white p-4 drop-shadow-[0px_4px_7px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-[8px]">
              {community.logo_url ? (
                <img
                  src={community.logo_url}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 size-full rounded-[8px] object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center bg-[#f5f5f7] text-[15px] font-semibold text-[#8c8e9a]">
                  {community.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[8px] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.08)]"
              />
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-[#f5f5f7] p-1 transition-colors duration-200 ease-out group-hover:bg-[#ebebee]">
              <img
                src={arrowUpRight}
                alt=""
                width={20}
                height={20}
                className="block max-w-none transition-transform duration-300 ease-out-strong group-hover:translate-x-[1.5px] group-hover:-translate-y-[1.5px]"
              />
            </span>
          </div>

          <div className="flex flex-col gap-[14px]">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3 className="-my-[0.3em] truncate py-[0.3em] text-[18px] font-medium leading-normal text-[#111] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                {community.name}
              </h3>
              {community.verified && (
                <img
                  src={verifiedBadge}
                  alt="Verified"
                  width={16}
                  height={16}
                  className="block max-w-none shrink-0"
                />
              )}
            </div>
            {summary && (
              <p className="line-clamp-3 text-[14px] leading-[1.44] text-[rgba(17,17,17,0.5)]">
                {summary}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
