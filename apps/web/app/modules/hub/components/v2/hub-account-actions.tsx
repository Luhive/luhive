import { Link } from "react-router";
import { Plus } from "lucide-react";
import type { HubViewer } from "~/modules/hub/model/hub-v2-types";
import { useCalBookingUrl } from "~/shared/hooks/use-cal-booking-url";
import { Routes } from "~/shared/lib/routing/routes";
import { HubProfileMenu } from "~/modules/hub/components/v2/hub-profile-menu";
import userIcon from "~/assets/images/hub-v2/user.svg";

type HubAccountActionsProps = {
  viewer: HubViewer | null;
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
    <div className="flex items-center gap-[10px] md:gap-2">
      <a
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex h-11 items-center justify-center gap-1.5 overflow-hidden rounded-[44px] bg-black px-4 text-[15px] font-medium leading-normal text-white hover:bg-[#262626] md:h-9 md:text-[13px] ${pillPress}`}
      >
        <Plus className="size-4 sm:hidden" strokeWidth={2.25} aria-hidden />
        <span className="sm:hidden">Create</span>
        <span className="hidden sm:inline">Create a community</span>
      </a>

      {viewer ? (
        <HubProfileMenu viewer={viewer} />
      ) : (
        <Link
          to={Routes.login}
          onClick={rememberReturnPath}
          aria-label="Sign in"
          className={`flex size-11 items-center justify-center overflow-hidden rounded-[44px] bg-[#f6f6f6] hover:bg-[#efefef] md:size-9 ${pillPress}`}
        >
          <img src={userIcon} alt="" width={20} height={20} className="block max-w-none md:scale-90" />
        </Link>
      )}
    </div>
  );
}
