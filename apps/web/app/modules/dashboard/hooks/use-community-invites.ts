import { useCallback, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Routes } from "~/shared/lib/routing/routes";
import type {
  CommunityInviteActionResponse,
  CommunityInvitesResponse,
} from "~/modules/dashboard/model/community-invite";

/** Pending admin invites for the owner's sheet. Loads while `open`; a sent invite or a revoke reloads the list. */
export function useCommunityInvites(
  communityId: string,
  { open, onInviteSent }: { open: boolean; onInviteSent: () => void },
) {
  const list = useFetcher<CommunityInvitesResponse>();
  const mutation = useFetcher<CommunityInviteActionResponse>();
  // formData is gone once the fetcher is idle, so remember what was submitted.
  const lastIntentRef = useRef<"invite" | "revoke" | null>(null);

  useEffect(() => {
    if (!open) return;
    list.load(`${Routes.api.community.invites}?communityId=${encodeURIComponent(communityId)}`);
  }, [open, communityId]);

  useEffect(() => {
    if (mutation.state !== "idle" || !mutation.data) return;
    if (mutation.data.success) {
      toast.success(mutation.data.message);
      if (lastIntentRef.current === "invite") onInviteSent();
    } else {
      toast.error(mutation.data.error ?? "Something went wrong");
    }
    lastIntentRef.current = null;
  }, [mutation.state, mutation.data]);

  const sendInvite = useCallback(
    (email: string) => {
      lastIntentRef.current = "invite";
      mutation.submit(
        { intent: "invite", communityId, email },
        { method: "post", action: Routes.api.community.invites },
      );
    },
    [communityId, mutation.submit],
  );

  const revokeInvite = useCallback(
    (inviteId: string) => {
      lastIntentRef.current = "revoke";
      mutation.submit(
        { intent: "revoke", communityId, inviteId },
        { method: "post", action: Routes.api.community.invites },
      );
    },
    [communityId, mutation.submit],
  );

  const pending = mutation.state === "idle" ? null : mutation.formData;

  return {
    invites: list.data?.invites ?? [],
    isLoading: !list.data && list.state === "loading",
    sendInvite,
    revokeInvite,
    sendingEmail: pending?.get("intent") === "invite" ? String(pending.get("email")) : null,
    revokingInviteId: pending?.get("intent") === "revoke" ? String(pending.get("inviteId")) : null,
  };
}
