import { Spinner } from "~/shared/components/ui/spinner";
import { profileLabelClassName } from "~/modules/profile/components/profile-tokens";
import type { CommunityInvite } from "~/modules/dashboard/model/community-invite";

type CommunityInviteListProps = {
  invites: CommunityInvite[];
  isLoading: boolean;
  sendingEmail: string | null;
  revokingInviteId: string | null;
  onResend: (email: string) => void;
  onRevoke: (inviteId: string) => void;
};

const actionClassName =
  "text-[13px] font-medium text-[#6e6e73] outline-none transition-colors duration-150 hover:text-[#111] focus-visible:text-[#111] disabled:opacity-50";

function formatInvitedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CommunityInviteList({
  invites,
  isLoading,
  sendingEmail,
  revokingInviteId,
  onResend,
  onRevoke,
}: CommunityInviteListProps) {
  return (
    <section className="space-y-3">
      <p className={profileLabelClassName}>Pending invites</p>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-4 text-[#6e6e73]" />
        </div>
      ) : invites.length === 0 ? (
        <p className="text-[13px] text-[#8c8e9a]">No pending invites.</p>
      ) : (
        <ul className="divide-y divide-black/[0.06] rounded-xl border border-black/[0.08]">
          {invites.map((invite) => {
            const isBusy = sendingEmail === invite.email || revokingInviteId === invite.id;
            return (
              <li key={invite.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-[#111]">{invite.email}</p>
                  <p className="text-[12px] text-[#8c8e9a]">
                    Invited {formatInvitedDate(invite.updated_at)}
                  </p>
                </div>
                {isBusy ? (
                  <Spinner className="size-4 text-[#6e6e73]" />
                ) : (
                  <div className="flex shrink-0 items-center gap-3">
                    <button type="button" className={actionClassName} onClick={() => onResend(invite.email)}>
                      Resend
                    </button>
                    <button type="button" className={actionClassName} onClick={() => onRevoke(invite.id)}>
                      Revoke
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
