import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { HubLegacyData } from "~/modules/hub/model/hub-legacy-types";
import {
  getVisibleCommunities,
  getUserProfile,
  getAdminCommunityIds,
} from "~/modules/hub/data/hub-repo.server";

export async function loader({ context }: LoaderFunctionArgs) {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);

  const dataPromise = (async (): Promise<HubLegacyData> => {
    const user = await findAuthUser();

    const { communities, error } = await getVisibleCommunities(supabase);

    if (error) {
      console.error("Error fetching communities:", error);
      return {
        communities: [],
        user: user ? { id: user.id } : null,
      };
    }

    if (!communities || communities.length === 0) {
      return {
        communities: [],
        user: user ? { id: user.id } : null,
      };
    }

    let userProfile: HubLegacyData["user"] = null;
    let adminIds = new Set<string>();
    if (user) {
      const [profile, adminCommunityIds] = await Promise.all([
        getUserProfile(supabase, user.id),
        getAdminCommunityIds(supabase, user.id),
      ]);
      userProfile = profile;
      adminIds = new Set(adminCommunityIds);
    }

    const communitiesWithAdmin = communities.map((c) => ({
      ...c,
      isAdmin: adminIds.has(c.id),
    }));

    return {
      communities: communitiesWithAdmin,
      user: userProfile,
    };
  })();

  return {
    data: dataPromise,
  };
}
