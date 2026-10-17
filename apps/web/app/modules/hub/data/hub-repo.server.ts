import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";
import type { HubCommunity } from "~/shared/models/entity.types";
import type { Community, HubPreview, UserData } from "~/modules/hub/model/hub-types";
import type { ManagedCommunity } from "~/modules/hub/model/hub-v2-types";

function toCommunity(row: HubCommunity): Community | null {
  if (
    row.id == null ||
    row.name == null ||
    row.slug == null ||
    row.created_by == null ||
    row.is_show == null ||
    row.tracking_enabled == null
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    created_by: row.created_by,
    is_show: row.is_show,
    tracking_enabled: row.tracking_enabled,
    cover_url: row.cover_url,
    created_at: row.created_at,
    description: row.description,
    logo_url: row.logo_url,
    page_config: row.page_config,
    parent_community_id: row.parent_community_id,
    settings: row.settings,
    social_links: row.social_links,
    stats: row.stats,
    tagline: row.tagline,
    updated_at: row.updated_at,
    verified: row.verified,
    memberCount: row.member_count ?? 0,
    eventCount: row.event_count ?? 0,
  };
}

export async function getVisibleCommunities(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("hub_communities")
    .select("*")
    .order("created_at", { ascending: false });

  const communities = (data ?? []).flatMap((row) => {
    const community = toCommunity(row);
    return community ? [community] : [];
  });

  return { communities, error };
}

const HUB_PREVIEW_LOGO_LIMIT = 3;

export async function getHubPreview(
  supabase: SupabaseClient<Database>,
): Promise<HubPreview | null> {
  const [countResult, logoResult] = await Promise.all([
    supabase
      .from("communities")
      .select("id", { count: "exact", head: true })
      .eq("is_show", true),
    supabase
      .from("communities")
      .select("name, logo_url")
      .eq("is_show", true)
      .not("logo_url", "is", null)
      .neq("logo_url", "")
      .order("created_at", { ascending: false })
      .limit(HUB_PREVIEW_LOGO_LIMIT),
  ]);

  if (countResult.error || logoResult.error) {
    console.error("Failed to load hub preview:", countResult.error ?? logoResult.error);
    return null;
  }

  const logos = (logoResult.data ?? []).flatMap((community) => {
    if (!community.logo_url) return [];
    return [{ name: community.name, logoUrl: community.logo_url }];
  });

  return {
    logos,
    communityCount: countResult.count ?? 0,
  };
}

export async function getUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserData> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, avatar_url, full_name")
    .eq("id", userId)
    .single();

  return profile
    ? {
        id: profile.id,
        avatar_url: profile.avatar_url,
        full_name: profile.full_name,
      }
    : { id: userId };
}

export async function getAdminCommunityIds(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string[]> {
  const [createdResult, membershipResult] = await Promise.all([
    supabase.from("communities").select("id").eq("created_by", userId),
    supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", userId)
      .in("role", ["admin", "owner"]),
  ]);

  const ids = new Set<string>();
  (createdResult.data || []).forEach((c) => ids.add(c.id));
  (membershipResult.data || []).forEach((m) => {
    if (m.community_id) ids.add(m.community_id);
  });
  return Array.from(ids);
}

/** Includes hidden communities: the viewer still manages them even when the hub doesn't list them. */
export async function listManagedCommunities(
  supabase: SupabaseClient<Database>,
  communityIds: string[],
): Promise<ManagedCommunity[]> {
  if (communityIds.length === 0) return [];

  const { data, error } = await supabase
    .from("communities")
    .select("id, name, slug, logo_url")
    .in("id", communityIds)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load managed communities:", error);
    return [];
  }

  return (data ?? []).map((community) => ({
    id: community.id,
    name: community.name,
    slug: community.slug,
    logoUrl: community.logo_url,
  }));
}
