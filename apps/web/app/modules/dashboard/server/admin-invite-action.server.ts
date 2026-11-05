import { data, redirect, type ActionFunctionArgs } from "react-router";
import { findAdminInvite } from "~/modules/dashboard/server/admin-invite.server";
import { deleteCommunityInvite } from "~/modules/dashboard/data/community-invites-repo.server";
import { grantAdminRole } from "~/modules/dashboard/data/members-repo.server";
import { createProfileIfMissing } from "~/modules/profile/data/profiles-repo.server";
import type { AdminInviteActionData } from "~/modules/dashboard/model/community-invite";
import { Routes } from "~/shared/lib/routing/routes";
import { createClient, createServiceRoleClient } from "~/shared/lib/supabase/server";

const INVALID_INVITE = "This invite is no longer valid.";

/**
 * `intent=send-code` emails a one-time code to the invited address, creating the account if
 * there is none. The page verifies it through `/auth/verify-otp`, then posts `intent=accept`.
 */
export async function action({ request, params, context }: ActionFunctionArgs) {
  const found = await findAdminInvite({ params, context });
  if (!found) return data<AdminInviteActionData>({ error: INVALID_INVITE });

  const { invite, community, invitee } = found;
  const intent = (await request.formData()).get("intent");

  if (intent === "send-code") {
    const { supabase, headers } = createClient(request);
    const { error } = await supabase.auth.signInWithOtp({
      email: invite.email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      console.error("Failed to send admin invite code:", error);
      return data<AdminInviteActionData>(
        { error: "Couldn't send the code. Try again in a minute." },
        { headers },
      );
    }
    return data<AdminInviteActionData>({ codeSent: true }, { headers });
  }

  if (intent !== "accept" || !invitee) return data<AdminInviteActionData>({ error: INVALID_INVITE });

  const serviceClient = createServiceRoleClient();
  const profile = await createProfileIfMissing(serviceClient, invitee);
  const grant = profile.error
    ? profile
    : await grantAdminRole(serviceClient, { communityId: community.id, userId: invitee.id });
  if (grant.error) {
    console.error("Failed to accept admin invite:", grant.error);
    return data<AdminInviteActionData>({ error: "Couldn't accept the invite. Try again." });
  }

  await deleteCommunityInvite(invite.id, community.id);
  throw redirect(Routes.dashboard.overview(community.slug));
}
