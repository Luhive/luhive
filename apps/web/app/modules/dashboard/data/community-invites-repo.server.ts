import { createServiceRoleClient } from "~/shared/lib/supabase/server";

function invites() {
  return createServiceRoleClient().from("community_invites");
}

export async function listCommunityInvites(communityId: string) {
  const { data, error } = await invites()
    .select("id, email, updated_at")
    .eq("community_id", communityId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function findCommunityInvite(inviteId: string) {
  const { data, error } = await invites()
    .select("id, community_id, email, invited_by")
    .eq("id", inviteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Inserts the invite, or moves its `updated_at` when that email was already invited. */
export async function saveCommunityInvite(row: {
  community_id: string;
  email: string;
  invited_by: string;
}) {
  const { data: existing, error: findError } = await invites()
    .select("id")
    .eq("community_id", row.community_id)
    .eq("email", row.email)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  if (existing) {
    const { error } = await invites()
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id };
  }

  const { data, error } = await invites().insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deleteCommunityInvite(inviteId: string, communityId: string) {
  const { error } = await invites()
    .delete()
    .eq("id", inviteId)
    .eq("community_id", communityId);
  if (error) throw new Error(error.message);
}
