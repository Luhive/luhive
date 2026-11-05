import { useState, type FormEvent } from "react";
import { Send, UserPlus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/shared/components/ui/sheet";
import { Spinner } from "~/shared/components/ui/spinner";
import {
  profileFieldClassName,
  profileLabelClassName,
  profilePrimaryButtonClassName,
  profileSecondaryButtonClassName,
} from "~/modules/profile/components/profile-tokens";
import { CommunityInviteList } from "~/modules/dashboard/components/community-invite-list";
import { useCommunityInvites } from "~/modules/dashboard/hooks/use-community-invites";

type CommunityInviteSheetProps = {
  communityId: string;
};

export function CommunityInviteSheet({ communityId }: CommunityInviteSheetProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const { invites, isLoading, sendInvite, revokeInvite, sendingEmail, revokingInviteId } =
    useCommunityInvites(communityId, { open, onInviteSent: () => setEmail("") });
  const isSending = sendingEmail !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendInvite(email);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={`${profileSecondaryButtonClassName} gap-1.5`}>
          <UserPlus className="size-4" />
          Invite admin
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full bg-white ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=closed]:duration-300 data-[state=open]:duration-300 sm:max-w-[480px]"
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="text-[22px] font-semibold tracking-tight text-[#111]">Invite an admin</SheetTitle>
          <SheetDescription className="text-[13px] text-[#6e6e73]">
            Admins can open this dashboard and follow members, events, and statistics.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="invite_email" className={profileLabelClassName}>
              Email
            </label>
            <div className="flex gap-2">
              <input
                id="invite_email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSending}
                placeholder="partner@company.com"
                className={profileFieldClassName}
              />
              <button
                type="submit"
                disabled={isSending}
                className={`${profilePrimaryButtonClassName} h-11 shrink-0 gap-1.5 disabled:opacity-60`}
              >
                {isSending ? <Spinner className="size-4" /> : <Send className="size-4" />}
                Send
              </button>
            </div>
          </form>
          <CommunityInviteList
            invites={invites}
            isLoading={isLoading}
            sendingEmail={sendingEmail}
            revokingInviteId={revokingInviteId}
            onResend={sendInvite}
            onRevoke={revokeInvite}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
