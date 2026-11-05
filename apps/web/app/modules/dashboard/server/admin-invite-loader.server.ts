import type { LoaderFunctionArgs } from "react-router";
import { findAdminInvite } from "~/modules/dashboard/server/admin-invite.server";
import type { AdminInviteLoaderData } from "~/modules/dashboard/model/community-invite";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

export async function loader({ params, context }: LoaderFunctionArgs): Promise<AdminInviteLoaderData> {
  const found = await findAdminInvite({ params, context });
  if (!found) return { state: "invalid" };

  const { invite, community, invitee } = found;
  const { supabase } = context.get(requestSupabaseContext);
  const { data: inviter } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", invite.invited_by)
    .maybeSingle();

  return {
    state: "ready",
    communityName: community.name,
    communityLogoUrl: community.logo_url,
    inviterName: inviter?.full_name || community.name,
    invitedEmail: invite.email,
    isSignedInAsInvitee: invitee !== null,
  };
}
