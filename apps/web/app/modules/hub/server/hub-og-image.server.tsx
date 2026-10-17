import type { createClient } from "~/shared/lib/supabase/server";
import { ogFactory } from "~/shared/lib/og/og-factory";
import { findHubOgWeekStart, formatHubOgWeekKey } from "~/modules/hub/utils/hub-og-week";
import { loadHubOgAssets } from "~/modules/hub/server/og/load-hub-og-assets.server";
import { HubOgTemplate } from "~/modules/hub/server/og/hub-og-template";

type Supabase = ReturnType<typeof createClient>["supabase"];

const WEEK_SECONDS = 7 * 24 * 60 * 60;
const WEEK_MS = WEEK_SECONDS * 1000;
/** Older weeks are only kept for links already shared; anything else is rejected before rendering. */
const OLDEST_WEEK_OFFSET = -12;
const NEWEST_WEEK_OFFSET = 1;
const MAX_CACHED_WEEKS = 4;
const FALLBACK_IMAGE = "/ogimage.png";

/** The URL names the week, so one rendering is valid for a week everywhere: browsers, CDN and crawlers. */
const WEEK_CACHE_HEADERS: Record<string, string> = {
  "Content-Type": "image/png",
  "Cache-Control": `public, max-age=${WEEK_SECONDS}, immutable`,
  "CDN-Cache-Control": `public, max-age=${WEEK_SECONDS}, immutable`,
};

const FALLBACK_CACHE_HEADERS: Record<string, string> = {
  "Content-Type": "image/png",
  "Cache-Control": "public, max-age=300",
};

/** One rendering per week per server instance; the CDN absorbs the rest. */
const renderedWeeks = new Map<string, Promise<ArrayBuffer>>();

function rememberRendering(weekKey: string, rendering: Promise<ArrayBuffer>) {
  renderedWeeks.set(weekKey, rendering);
  rendering.catch(() => renderedWeeks.delete(weekKey));
  while (renderedWeeks.size > MAX_CACHED_WEEKS) {
    const oldestKey = renderedWeeks.keys().next().value;
    if (oldestKey === undefined) break;
    renderedWeeks.delete(oldestKey);
  }
}

function isWithinServedWeeks(weekStart: Date) {
  const currentWeekStart = findHubOgWeekStart(formatHubOgWeekKey(new Date()));
  if (!currentWeekStart) return false;
  const offset = Math.round((weekStart.getTime() - currentWeekStart.getTime()) / WEEK_MS);
  return offset >= OLDEST_WEEK_OFFSET && offset <= NEWEST_WEEK_OFFSET;
}

async function renderWeek(supabase: Supabase, origin: string, weekStart: Date) {
  const assets = await loadHubOgAssets(supabase, origin, weekStart);
  const response = await ogFactory.render(<HubOgTemplate {...assets} />, { fonts: assets.fonts });
  if (!response.ok) throw new Error(`Hub OG render failed with status ${response.status}`);
  return response.arrayBuffer();
}

async function fallbackImage(origin: string) {
  const bytes = await fetch(`${origin}${FALLBACK_IMAGE}`).then((response) => response.arrayBuffer());
  return new Response(bytes, { headers: FALLBACK_CACHE_HEADERS });
}

/** The hub's share image for one ISO week, e.g. `2026-W42`. */
export async function generateHubOgImage(
  supabase: Supabase,
  origin: string,
  weekKey: string,
): Promise<Response> {
  const weekStart = findHubOgWeekStart(weekKey);
  if (!weekStart || !isWithinServedWeeks(weekStart)) {
    return new Response("Unknown week", { status: 404 });
  }

  let rendering = renderedWeeks.get(weekKey);
  if (!rendering) {
    rendering = renderWeek(supabase, origin, weekStart);
    rememberRendering(weekKey, rendering);
  }

  try {
    return new Response(await rendering, { headers: WEEK_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to generate hub OG image:", error);
    return fallbackImage(origin);
  }
}
