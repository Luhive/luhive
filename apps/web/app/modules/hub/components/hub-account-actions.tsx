import { Link } from "react-router";
import { Plus } from "lucide-react";
import type { HubViewer } from "~/modules/hub/model/hub-types";
import { useCalBookingUrl } from "~/shared/hooks/use-cal-booking-url";
import { Routes } from "~/shared/lib/routing/routes";
import { HubProfileMenu } from "~/modules/hub/components/hub-profile-menu";

type HubAccountActionsProps = {
  viewer: HubViewer | null;
  /** While the session resolves, hold the slot instead of flashing "Sign in". */
  isViewerPending?: boolean;
};

const pillPress =
  "transition-[transform,background-color] duration-150 ease-out-strong active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-[#111]/20 focus-visible:ring-offset-2";

function rememberReturnPath() {
  window.localStorage.setItem(
    "post_login_return_to",
    window.location.pathname + window.location.search,
  );
}

export function HubAccountActions({ viewer, isViewerPending = false }: HubAccountActionsProps) {
  const bookingUrl = useCalBookingUrl();

  return (
    <div className="flex items-center gap-[10px] md:gap-2">
      <a
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-hub-control
        className={`flex h-11 items-center justify-center gap-1.5 overflow-hidden rounded-[44px] bg-black px-4 text-[15px] font-medium leading-normal text-white hover:bg-[#262626] md:h-9 md:text-[13px] ${pillPress}`}
      >
        <Plus className="size-4 sm:hidden" strokeWidth={2.25} aria-hidden />
        <span className="sm:hidden">Create</span>
        <span className="hidden sm:inline">Create a community</span>
      </a>

      {isViewerPending ? (
        <span aria-hidden className="size-11 rounded-full bg-[#95959522] md:size-9" />
      ) : viewer ? (
        <HubProfileMenu viewer={viewer} />
      ) : (
        <Link
          to={Routes.login}
          onClick={rememberReturnPath}
          data-hub-control
          className="flex h-11 items-center justify-center rounded-[44px] px-3.5 text-[15px] font-medium leading-normal text-[#111] outline-none [transition:background-color_300ms_var(--ease-standard),transform_150ms_var(--ease-out-strong)] hover:bg-[#95959522] focus-visible:bg-[#95959522] active:scale-[0.97] md:h-9 md:px-3 md:text-[13px]"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
