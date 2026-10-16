import type { Community } from "~/modules/hub/model/hub-types";
import { Routes } from "~/shared/lib/routing/routes";

export function getCommunityHref(community: Community) {
  return community.isAdmin
    ? Routes.dashboard.overview(community.slug)
    : Routes.community.detail(community.slug);
}
