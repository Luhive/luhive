import type { Community } from "~/modules/hub/model/hub-types";
import { Routes } from "~/shared/lib/routing/routes";

/** Admins land on their dashboard; everyone else on the public community page. */
export function getCommunityHref(community: Community) {
  return community.isAdmin
    ? Routes.dashboard.overview(community.slug)
    : Routes.community.detail(community.slug);
}
