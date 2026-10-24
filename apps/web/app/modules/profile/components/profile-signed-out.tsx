import { Link } from "react-router";
import {
  activityLevelClassName,
  profileCardClassName,
  profilePrimaryButtonClassName,
} from "~/modules/profile/components/profile-tokens";
import { Routes } from "~/shared/lib/routing/routes";

const PREVIEW_COLUMNS = 16;

/** Column-major levels for a decorative year. Recent days carry the orange. */
const PREVIEW_LEVELS = Array.from({ length: PREVIEW_COLUMNS * 7 }, (_, index) => {
  const column = Math.floor(index / 7);
  const row = index % 7;
  if (column === 14 && (row === 1 || row === 2)) return 3;
  if (column === 13 && row === 2) return 2;
  if (column === 12 && row === 4) return 1;
  if (column === 10 && row === 0) return 1;
  if (column === 8 && row === 3) return 2;
  if (column === 6 && row === 5) return 1;
  return 0;
});

function ProfilePreview() {
  return (
    <div
      aria-hidden
      className="pointer-events-none w-full select-none"
      style={{
        maskImage: "linear-gradient(to bottom, black 42%, transparent 92%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 42%, transparent 92%)",
      }}
    >
      <div className={`${profileCardClassName} p-5`}>
        <div className="flex items-center gap-4">
          <div className="size-14 shrink-0 rounded-full bg-[#ececee]" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-36 rounded-full bg-[#ececee]" />
            <div className="mt-2.5 h-2.5 w-52 max-w-full rounded-full bg-[#f3f3f4]" />
          </div>
        </div>
        <div className="mt-6">
          <p className="text-[13px] font-medium text-[#6e6e73]">Activity</p>
          <div className="mt-3 grid grid-cols-[repeat(16,minmax(0,1fr))] grid-flow-col grid-rows-7 gap-[3px]">
            {PREVIEW_LEVELS.map((level, index) => (
              <span
                key={index}
                className={`block aspect-square w-full rounded-full ${activityLevelClassName[level]}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={`${profileCardClassName} mt-3 overflow-hidden`}>
        <PreviewRow markClassName="bg-primary/80" widthClassName="w-28" />
        <PreviewRow markClassName="bg-[#d8d8dc]" widthClassName="w-36" />
      </div>
    </div>
  );
}

function PreviewRow({ markClassName, widthClassName }: { markClassName: string; widthClassName: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-b-0">
      <div className={`size-10 shrink-0 rounded-[10px] ${markClassName}`} />
      <div className="min-w-0 flex-1">
        <div className={`h-3 rounded-full bg-[#ececee] ${widthClassName}`} />
        <div className="mt-2 h-4 w-14 rounded-full bg-black/[0.05]" />
      </div>
    </div>
  );
}

function rememberReturnPath() {
  window.localStorage.setItem(
    "post_login_return_to",
    window.location.pathname + window.location.search,
  );
}

export function ProfileSignedOut() {
  return (
    <div className="font-inter flex flex-1 flex-col items-center justify-center pb-20 text-[#111]">
      <div className="animate-hub-rise w-full max-w-[460px]">
        <ProfilePreview />
        <div className="relative -mt-16 text-center">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Your profile lives here</h1>
          <p className="mx-auto mt-2 max-w-[380px] text-[15px] leading-relaxed text-[#6e6e73]">
            The events you joined or hosted, the updates you sent, the communities you’re part of. They can’t wait to see you signed in.
          </p>
          <Link
            to={Routes.login}
            onClick={rememberReturnPath}
            className={`${profilePrimaryButtonClassName} mt-6 h-10 px-5 text-[14px]`}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
