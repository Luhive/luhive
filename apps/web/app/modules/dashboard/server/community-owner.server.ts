import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

/** The signed-in user and the community, when that user owns it. Otherwise null. */
export async function findOwnedCommunity(
  context: LoaderFunctionArgs["context"],
  communityId: string,
) {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);
  const user = await findAuthUser();
  if (!user || !communityId) return null;

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug, created_by")
    .eq("id", communityId)
    .maybeSingle();

  if (!community || community.created_by !== user.id) return null;
  return { user, community };
}
