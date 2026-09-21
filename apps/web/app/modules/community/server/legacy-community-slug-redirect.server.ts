import { Routes } from "~/shared/lib/routing/routes";

/**
 * Temporary map of renamed community slugs (old -> new).
 *
 * A community changed its slug but old links were already shared, so we
 * redirect the whole `/c/{oldSlug}/*` subtree to the new slug until the
 * event passes. Remove entries (or this file) to turn the redirect off.
 */
const LEGACY_COMMUNITY_SLUG_ALIASES: Record<string, string> = {
  "enhance-ventures": "innovation-wednesdays",
  "cursor-baku": "spacexai-baku",
};

/**
 * When `slug` is a known legacy alias, return the target path with the
 * `/c/{oldSlug}` prefix swapped for `/c/{newSlug}`, preserving the rest of
 * the pathname and the query string. Returns `null` otherwise.
 */
export function getLegacyCommunitySlugRedirect(
  request: Request,
  slug: string,
): string | null {
  const newSlug = LEGACY_COMMUNITY_SLUG_ALIASES[slug];
  if (!newSlug) return null;

  const url = new URL(request.url);
  const oldBase = Routes.community.detail(slug);
  const newBase = Routes.community.detail(newSlug);

  return `${newBase}${url.pathname.slice(oldBase.length)}${url.search}`;
}
