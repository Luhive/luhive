import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";
import type { ProfileCommunity } from "~/modules/profile/model/profile-community";

const MANAGING_ROLES = new Set(["owner", "admin"]);

export async function listProfileCommunities(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileCommunity[]> {
  const [memberships, created] = await Promise.all([
    supabase.from("community_members").select("community_id, role").eq("user_id", userId),
    supabase.from("communities").select("id").eq("created_by", userId),
  ]);

  if (memberships.error) {
    console.error("Failed to load profile memberships:", memberships.error);
  }
  if (created.error) {
    console.error("Failed to load communities created by profile:", created.error);
  }

  const roleByCommunityId = new Map<string, string | null>();
  for (const membership of memberships.data ?? []) {
    if (membership.community_id) {
      roleByCommunityId.set(membership.community_id, membership.role);
    }
  }

  const createdIds = new Set<string>();
  for (const community of created.data ?? []) {
    createdIds.add(community.id);
    if (!roleByCommunityId.has(community.id)) {
      roleByCommunityId.set(community.id, "owner");
    }
  }

  const communityIds = [...roleByCommunityId.keys()];
  if (communityIds.length === 0) return [];

  const { data, error } = await supabase
    .from("communities")
    .select("id, name, slug, logo_url")
    .in("id", communityIds)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load profile communities:", error);
    return [];
  }

  return (data ?? []).map((community) => {
    const role = roleByCommunityId.get(community.id) ?? null;
    return {
      id: community.id,
      name: community.name,
      slug: community.slug,
      logoUrl: community.logo_url,
      role,
      canManage: createdIds.has(community.id) || MANAGING_ROLES.has(role ?? ""),
    };
  });
}
