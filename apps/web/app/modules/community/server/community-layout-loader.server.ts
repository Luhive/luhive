import { redirect } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { LoaderFunctionArgs } from "react-router";
import type { Community } from "~/modules/community/model/community-types";
import type { Profile } from "~/shared/models/entity.types";
import {
  logLoaderTiming,
  timedLoader,
} from "~/shared/lib/diagnostics/loader-timing.server";
import { getLegacyCommunitySlugRedirect } from "~/modules/community/server/legacy-community-slug-redirect.server";

const COMMUNITY_LAYOUT_COLUMNS =
  "id, name, slug, logo_url, created_by, description, tagline, cover_url, verified, is_show, social_links";

const PROFILE_LAYOUT_COLUMNS = "id, full_name, avatar_url";

export type CommunityLayoutLoaderData = {
  community: Community | null;
  isOwner: boolean;
  isMember: boolean;
  user: { id: string; email?: string | null } | null;
  profile: Profile | null;
};

export async function loader({
  request,
  params,
  context,
}: LoaderFunctionArgs): Promise<CommunityLayoutLoaderData> {
  const loaderStartedAt = performance.now();
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);

  const user = await timedLoader("communityLayout auth getUser", findAuthUser());

  const slug = (params as { slug?: string }).slug;

  //TODO: Remove this once we have a proper redirect system
  if (slug) {
    const legacyTarget = getLegacyCommunitySlugRedirect(request, slug);
    if (legacyTarget) throw redirect(legacyTarget, 302);
  }

  if (!slug) {
    const { data: profile } = user
      ? await supabase
          .from("profiles")
          .select(PROFILE_LAYOUT_COLUMNS)
          .eq("id", user.id)
          .single()
      : { data: null };

    return {
      community: null,
      isOwner: false,
      isMember: false,
      user: user || null,
      profile: (profile as Profile | null) ?? null,
    };
  }

  const { data: community, error } = await timedLoader(
    "communityLayout community by slug",
    supabase
      .from("communities")
      .select(COMMUNITY_LAYOUT_COLUMNS)
      .eq("slug", slug)
      .single(),
  );

  if (error || !community) {
    throw new Response("Community not found", { status: 404 });
  }

  const isCreator = user ? community.created_by === user.id : false;

  const [membershipResult, profileResult] = await Promise.all([
    user
      ? supabase
          .from("community_members")
          .select("id, role")
          .eq("user_id", user.id)
          .eq("community_id", community.id)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    user
      ? supabase
          .from("profiles")
          .select(PROFILE_LAYOUT_COLUMNS)
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const isMember = !!membershipResult.data;
  const isOwner =
    isCreator ||
    (membershipResult.data &&
      (membershipResult.data.role === "owner" ||
        membershipResult.data.role === "admin"));

  const loaderData = {
    community: community as Community,
    isOwner: Boolean(isOwner),
    isMember,
    user: user || null,
    profile: (profileResult.data as Profile | null) ?? null,
  };
  logLoaderTiming("communityLayout loader total", loaderStartedAt);
  return loaderData;
}
