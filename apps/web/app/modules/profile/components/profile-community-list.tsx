import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { CommunityLogo } from "~/modules/hub/components/community-logo";
import type { ProfileCommunity } from "~/modules/profile/model/profile-community";
import type { ProfileMemberCount } from "~/modules/profile/model/profile-stats";
import {
  profileCardClassName,
  profileSecondaryButtonClassName,
  profileTextButtonClassName,
} from "~/modules/profile/components/profile-tokens";
import { Routes } from "~/shared/lib/routing/routes";

const PREVIEW_COUNT = 3;

type ProfileCommunityListProps = {
  communities: ProfileCommunity[];
  memberCounts: ProfileMemberCount[];
};

function roleLabel(role: string | null) {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function roleRank(role: string | null) {
  const normalized = role?.toLowerCase();
  if (normalized === "owner") return 0;
  if (normalized === "admin") return 1;
  return 2;
}

function CommunityRow({
  community,
  members,
  stackIndex,
}: {
  community: ProfileCommunity;
  members: number | undefined;
  stackIndex?: number;
}) {
  return (
    <li
      className={`flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-b-0 ${stackIndex === undefined ? "" : "profile-past-stack"}`}
      style={
        stackIndex === undefined
          ? undefined
          : ({ "--stack-delay": `${Math.min(stackIndex, 6) * 40}ms` } as CSSProperties)
      }
    >
      <Link
        to={Routes.community.detail(community.slug)}
        prefetch="intent"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#111]/15"
      >
        <CommunityLogo
          name={community.name}
          logoUrl={community.logoUrl}
          className="size-10 rounded-[10px] text-[12px]"
        />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium leading-tight text-[#111]">{community.name}</span>
          <span className="mt-1 inline-flex rounded-full bg-black/[0.05] px-2 py-0.5 text-[12px] font-medium text-[#6e6e73]">
            {roleLabel(community.role)}
          </span>
        </span>
      </Link>
      <span className="hidden shrink-0 text-[13px] tabular-nums text-[#6e6e73] sm:block">
        {members === undefined ? "—" : `${members.toLocaleString()} members`}
      </span>
      {community.canManage ? (
        <Link to={Routes.dashboard.overview(community.slug)} prefetch="intent" className={profileSecondaryButtonClassName}>
          Dashboard
        </Link>
      ) : null}
    </li>
  );
}

function GhostCommunityRow({ markClassName, nameWidth }: { markClassName: string; nameWidth: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3">
      <div className={`size-10 shrink-0 rounded-[10px] ${markClassName}`} />
      <div className="min-w-0 flex-1">
        <div className={`h-3 rounded-full bg-[#ececee] ${nameWidth}`} />
        <div className="mt-2 h-4 w-14 rounded-full bg-black/[0.05]" />
      </div>
      <div className="hidden h-3 w-16 shrink-0 rounded-full bg-[#ececee] sm:block" />
    </div>
  );
}

function CommunitiesEmpty() {
  return (
    <div className="pb-8 text-center">
      <div
        aria-hidden
        className="pointer-events-none select-none"
        style={{
          maskImage: "linear-gradient(to bottom, black 42%, transparent 92%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 42%, transparent 92%)",
        }}
      >
        <GhostCommunityRow markClassName="bg-primary/80" nameWidth="w-28" />
        <GhostCommunityRow markClassName="bg-[#FFD3BC]" nameWidth="w-36" />
        <GhostCommunityRow markClassName="bg-[#ececee]" nameWidth="w-24" />
      </div>
      <div className="relative -mt-10 px-5">
        <p className="text-[20px] font-semibold leading-tight tracking-tight text-[#111]">
          Your communities will gather here
        </p>
        <p className="mx-auto mt-2 max-w-[320px] text-balance text-[15px] leading-relaxed text-[#6e6e73]">
          Join one from the hub or create one for yourself.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-1">
          <Link to={Routes.createCommunity} prefetch="intent" className={profileSecondaryButtonClassName}>
            Create a community
          </Link>
          <Link to={Routes.hub} prefetch="intent" className={profileTextButtonClassName}>
            Explore the hub
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProfileCommunityList({ communities, memberCounts }: ProfileCommunityListProps) {
  const [showAll, setShowAll] = useState(false);
  const countById = useMemo(
    () => new Map(memberCounts.map((count) => [count.communityId, count.memberCount])),
    [memberCounts],
  );
  const ranked = useMemo(
    () =>
      [...communities].sort((a, b) => {
        const byRole = roleRank(a.role) - roleRank(b.role);
        if (byRole !== 0) return byRole;
        return (countById.get(b.id) ?? -1) - (countById.get(a.id) ?? -1);
      }),
    [communities, countById],
  );

  if (communities.length === 0) {
    return (
      <div className={`${profileCardClassName} overflow-hidden`}>
        <CommunitiesEmpty />
      </div>
    );
  }

  const visible = ranked.slice(0, PREVIEW_COUNT);
  const rest = ranked.slice(PREVIEW_COUNT);

  return (
    <div>
      <div className={`${profileCardClassName} overflow-hidden`}>
        <ul>
          {visible.map((community) => (
            <CommunityRow key={community.id} community={community} members={countById.get(community.id)} />
          ))}
          {showAll
            ? rest.map((community, index) => (
                <CommunityRow
                  key={community.id}
                  community={community}
                  members={countById.get(community.id)}
                  stackIndex={index}
                />
              ))
            : null}
        </ul>
      </div>
      {rest.length > 0 && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mx-auto mt-3 block w-fit text-[13px] font-medium text-[#8c8e9a] outline-none transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/15 active:scale-[0.97] [@media(hover:hover)]:hover:text-[#6e6e73]"
        >
          Show more
        </button>
      ) : null}
    </div>
  );
}
