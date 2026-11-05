import { z } from "zod";
import type { LoaderFunctionArgs } from "react-router";
import { findCommunityInvite } from "~/modules/dashboard/data/community-invites-repo.server";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

/**
 * Resolves the live invite behind `/c/:slug/admin-invite/:inviteId`, or null.
 * `user` is the signed-in user when that user is the invitee, otherwise null.
 */
export async function findAdminInvite({ params, context }: Pick<LoaderFunctionArgs, "params" | "context">) {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);

  const inviteId = z.uuid().safeParse(params.inviteId);
  const invite = inviteId.success ? await findCommunityInvite(inviteId.data) : null;
  if (!invite) return null;

  const [{ data: community }, user] = await Promise.all([
    supabase
      .from("communities")
      .select("id, name, slug, logo_url")
      .eq("id", invite.community_id)
      .maybeSingle(),
    findAuthUser(),
  ]);
  if (!community || community.slug !== params.slug) return null;

  const invitee = user?.email?.toLowerCase() === invite.email ? user : null;
  return { invite, community, invitee };
}
