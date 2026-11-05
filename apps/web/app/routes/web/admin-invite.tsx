export { loader } from "~/modules/dashboard/server/admin-invite-loader.server";
export { action } from "~/modules/dashboard/server/admin-invite-action.server";
export { meta } from "~/modules/dashboard/model/admin-invite-meta";

import { useCallback } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { OtpInputInline } from "~/modules/auth/components/otp-input-inline";
import { AdminInviteCard } from "~/modules/dashboard/components/admin-invite-card";
import { AdminInviteInvalid } from "~/modules/dashboard/components/admin-invite-invalid";
import { profilePrimaryButtonClassName } from "~/modules/profile/components/profile-tokens";
import { Spinner } from "~/shared/components/ui/spinner";
import type { action } from "~/modules/dashboard/server/admin-invite-action.server";
import type { loader } from "~/modules/dashboard/server/admin-invite-loader.server";

const buttonClassName = `${profilePrimaryButtonClassName} w-full gap-1.5 disabled:opacity-60`;

export default function AdminInvitePage() {
  const invite = useLoaderData<typeof loader>();
  const codeFetcher = useFetcher<typeof action>();
  const acceptFetcher = useFetcher<typeof action>();

  // Verifying the code signs them in as the invitee, so accept right away.
  const accept = useCallback(
    () => acceptFetcher.submit({ intent: "accept" }, { method: "post" }),
    [acceptFetcher.submit],
  );

  if (invite.state === "invalid") {
    return (
      <main className="font-inter mx-auto max-w-md px-4 py-10">
        <AdminInviteInvalid />
      </main>
    );
  }

  const isAccepting = acceptFetcher.state !== "idle";
  const isSendingCode = codeFetcher.state !== "idle";

  return (
    <main className="font-inter mx-auto max-w-md px-4 py-10">
      <AdminInviteCard
        communityName={invite.communityName}
        communityLogoUrl={invite.communityLogoUrl}
        inviterName={invite.inviterName}
        error={acceptFetcher.data?.error ?? codeFetcher.data?.error ?? null}
      >
        {/* The code step stays mounted after verifying, while the page reloads as signed in, so its onSuccess fires. */}
        {codeFetcher.data?.codeSent ? (
          <OtpInputInline email={invite.invitedEmail} onSuccess={accept} />
        ) : invite.isSignedInAsInvitee ? (
          <button type="button" onClick={accept} disabled={isAccepting} className={buttonClassName}>
            {isAccepting && <Spinner className="size-4" />}
            Accept invite
          </button>
        ) : (
          <button
            type="button"
            onClick={() => codeFetcher.submit({ intent: "send-code" }, { method: "post" })}
            disabled={isSendingCode}
            className={buttonClassName}
          >
            {isSendingCode && <Spinner className="size-4" />}
            Accept as {invite.invitedEmail}
          </button>
        )}
      </AdminInviteCard>
    </main>
  );
}
