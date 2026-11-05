import type { ReactNode } from "react";
import { profileCardClassName } from "~/modules/profile/components/profile-tokens";

type AdminInviteCardProps = {
  communityName: string;
  communityLogoUrl: string | null;
  inviterName: string;
  error: string | null;
  children: ReactNode;
};

export function AdminInviteCard({
  communityName,
  communityLogoUrl,
  inviterName,
  error,
  children,
}: AdminInviteCardProps) {
  return (
    <div className={`${profileCardClassName} p-6`}>
      <div className="flex items-center gap-4">
        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f3f3f4] text-[18px] font-semibold text-[#8c8e9a]">
          {communityLogoUrl ? (
            <img src={communityLogoUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            communityName.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] text-[#6e6e73]">Admin invite</p>
          <h1 className="truncate text-[20px] font-semibold tracking-tight text-[#111]">{communityName}</h1>
        </div>
      </div>
      <p className="mt-4 text-[14px] text-[#6e6e73]">
        {inviterName} invited you to be an admin. You'll be able to open the community dashboard and follow its
        members, events, and statistics.
      </p>
      {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}
