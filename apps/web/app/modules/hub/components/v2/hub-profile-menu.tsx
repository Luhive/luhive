import { Link, useLocation, useSubmit } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { HubViewer } from "~/modules/hub/model/hub-v2-types";
import { clearEventRegistrationSessionState } from "~/modules/events/hooks/use-event-registration-query";
import { EVENT_PREVIEW_PARAM } from "~/modules/hub/hooks/use-event-preview-selection";
import { CommunityLogo } from "~/modules/hub/components/v2/community-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";
import { useSetCurrentUserCache } from "~/shared/hooks/use-current-user-query";
import { Routes } from "~/shared/lib/routing/routes";
import { cn } from "~/shared/lib/utils/cn";

type HubProfileMenuProps = {
  viewer: HubViewer;
};

const itemClassName =
  "cursor-pointer rounded-none px-4 py-1.5 text-[14px] text-[#5f616b] transition-[background-color,color] duration-200 ease-standard focus:bg-[#f6f6f6] focus:text-[#111]";

function getInitials(name: string | null | undefined) {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ViewerAvatar({ viewer, className }: { viewer: HubViewer; className: string }) {
  if (viewer.avatar_url) {
    return (
      <img
        src={viewer.avatar_url}
        alt=""
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-[#f1f1f3] text-[13px] font-semibold text-[#5f616b]`}
    >
      {getInitials(viewer.full_name)}
    </span>
  );
}

export function HubProfileMenu({ viewer }: HubProfileMenuProps) {
  const submit = useSubmit();
  const location = useLocation();
  const queryClient = useQueryClient();
  const setCurrentUserCache = useSetCurrentUserCache();

  function handleSignOut() {
    const params = new URLSearchParams(location.search);
    params.delete(EVENT_PREVIEW_PARAM);
    const search = params.toString();

    setCurrentUserCache(null, false);
    clearEventRegistrationSessionState(queryClient, { revalidate: false });
    submit(
      { returnTo: `${location.pathname}${search ? `?${search}` : ""}` },
      { method: "post", action: Routes.logout },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="-m-1 flex items-center justify-center rounded-full p-1 outline-none [transition:background-color_300ms_var(--ease-standard),transform_150ms_var(--ease-out-strong)] hover:bg-[#95959522] active:scale-[0.97] data-[state=open]:bg-[#95959522]"
      >
        <ViewerAvatar
          viewer={viewer}
          className="size-11 shadow-[inset_0_0_0_0.5px_rgba(21,21,21,0.08)] md:size-9"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="hub-touch-surface w-[260px] overflow-hidden rounded-[14px] border-[#ececee] bg-white p-0 font-inter shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <ViewerAvatar viewer={viewer} className="size-9" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-[15px] font-semibold leading-tight text-[#111]">
              {viewer.full_name || "Your account"}
            </p>
            {viewer.email && (
              <p className="truncate text-[13px] leading-tight text-[#8c8e9a]">{viewer.email}</p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="m-0 bg-[#ececee]" />
        {viewer.managedCommunities.length > 0 && (
          <>
            <DropdownMenuGroup className="py-1">
              <DropdownMenuLabel className="px-4 pb-1 pt-1.5 text-[12px] font-medium text-[#8c8e9a]">
                Your communities
              </DropdownMenuLabel>
              <div className="max-h-[188px] overflow-y-auto overscroll-contain">
                {viewer.managedCommunities.map((community) => (
                  <DropdownMenuItem key={community.id} asChild className={cn(itemClassName, "gap-2.5")}>
                    <Link to={Routes.dashboard.overview(community.slug)} prefetch="intent">
                      <CommunityLogo
                        name={community.name}
                        logoUrl={community.logoUrl}
                        className="size-6 rounded-[7px] text-[10px]"
                      />
                      <span className="truncate">{community.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="m-0 bg-[#ececee]" />
          </>
        )}
        <div className="py-1">
          <DropdownMenuItem asChild className={itemClassName}>
            <Link to={Routes.profile} prefetch="intent">
              View Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut} className={itemClassName}>
            Sign Out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
