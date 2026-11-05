import type { ActionFunctionArgs } from "react-router";
import {
  deleteCommunityInvite,
  saveCommunityInvite,
} from "~/modules/dashboard/data/community-invites-repo.server";
import { findOwnedCommunity } from "~/modules/dashboard/server/community-owner.server";
import {
  communityInviteEmailSchema,
  type CommunityInviteActionResponse,
} from "~/modules/dashboard/model/community-invite";
import { sendCommunityAdminInviteEmail } from "~/shared/lib/email.server";
import { getEmailOrigin } from "~/shared/lib/email/unsubscribe-token.server";
import { Routes } from "~/shared/lib/routing/routes";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

export async function action({
  request,
  context,
}: ActionFunctionArgs): Promise<CommunityInviteActionResponse> {
  if (request.method !== "POST") {
    return { success: false, error: "Method not allowed" };
  }

  const formData = await request.formData();
  const owned = await findOwnedCommunity(context, String(formData.get("communityId") ?? ""));
  if (!owned) {
    return { success: false, error: "Only the community owner can manage invites" };
  }

  const intent = formData.get("intent");

  if (intent === "revoke") {
    await deleteCommunityInvite(String(formData.get("inviteId") ?? ""), owned.community.id);
    return { success: true, message: "Invite revoked" };
  }

  if (intent !== "invite") {
    return { success: false, error: "Invalid intent" };
  }

  const email = communityInviteEmailSchema.safeParse(formData.get("email") ?? "");
  if (!email.success) {
    return { success: false, error: email.error.issues[0]?.message };
  }

  const { community, user } = owned;
  const invite = await saveCommunityInvite({
    community_id: community.id,
    email: email.data,
    invited_by: user.id,
  });

  const { supabase } = context.get(requestSupabaseContext);
  const { data: inviter } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  try {
    await sendCommunityAdminInviteEmail({
      communityName: community.name,
      inviterName: inviter?.full_name || community.name,
      recipientEmail: email.data,
      acceptLink: Routes.absolute(
        getEmailOrigin(),
        Routes.community.adminInvite(community.slug, invite.id),
      ),
    });
  } catch (error) {
    console.error("Failed to send admin invite email:", error);
    return { success: false, error: "Invite saved, but the email didn't send. Try Resend." };
  }

  return { success: true, message: `Invite sent to ${email.data}` };
}
