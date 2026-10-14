import { Link } from "react-router";
import { Plus } from "lucide-react";
import type { UserData } from "~/modules/hub/model/hub-types";
import { useCalBookingUrl } from "~/shared/hooks/use-cal-booking-url";
import { Routes } from "~/shared/lib/routing/routes";
import userIcon from "~/assets/images/hub-v2/user.svg";

type HubAccountActionsProps = {
  viewer: UserData;
};

const pillPress =
  "transition-[transform,background-color] duration-150 ease-out-strong active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-[#111]/20 focus-visible:ring-offset-2";

function rememberReturnPath() {
  window.localStorage.setItem(
    "post_login_return_to",
    window.location.pathname + window.location.search,
  );
}

export function HubAccountActions({ viewer }: HubAccountActionsProps) {
  const bookingUrl = useCalBookingUrl();

  return (
    <div className="flex items-center gap-[10px]">
      <a
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex h-11 items-center justify-center gap-1.5 overflow-hidden rounded-[44px] bg-black px-4 text-[15px] font-medium leading-normal text-white hover:bg-[#262626] md:text-[14px] ${pillPress}`}
      >
        <Plus className="size-4 sm:hidden" strokeWidth={2.25} aria-hidden />
        <span className="sm:hidden">Create</span>
        <span className="hidden sm:inline">Create a community</span>
      </a>

      {viewer ? (
        <Link
          to={Routes.profile}
          prefetch="intent"
          aria-label="Your profile"
          className={`flex size-11 items-center justify-center overflow-hidden rounded-[44px] bg-[#f6f6f6] hover:bg-[#efefef] ${pillPress}`}
        >
          {viewer.avatar_url ? (
            <img
              src={viewer.avatar_url}
              alt={viewer.full_name ?? "Profile"}
              className="size-full object-cover"
            />
          ) : (
            <img src={userIcon} alt="" width={20} height={20} className="block max-w-none" />
          )}
        </Link>
      ) : (
        <Link
          to={Routes.login}
          onClick={rememberReturnPath}
          aria-label="Sign in"
          className={`flex size-11 items-center justify-center overflow-hidden rounded-[44px] bg-[#f6f6f6] hover:bg-[#efefef] ${pillPress}`}
        >
          <img src={userIcon} alt="" width={20} height={20} className="block max-w-none" />
        </Link>
      )}
    </div>
  );
}
