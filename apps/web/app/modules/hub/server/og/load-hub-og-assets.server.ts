import type { createClient } from "~/shared/lib/supabase/server";
import type { OgFont } from "~/shared/lib/og/og-types";
import type { HubOgAssets, HubOgSticker, HubOgWeekDay } from "~/modules/hub/model/hub-og-types";
import { getHubPreview, getVisibleCommunities } from "~/modules/hub/data/hub-repo.server";
import {
  listPastHubEvents,
  listUpcomingHubEvents,
} from "~/modules/hub/data/hub-events-repo.server";

type Supabase = ReturnType<typeof createClient>["supabase"];

const DAY_MS = 86_400_000;
const IMAGE_FETCH_TIMEOUT_MS = 4000;
const COVER_BATCH_SIZE = 18;
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
/**
 * Demo fill: covers are spread over the week for a full-looking card, not placed on their real
 * dates. Switch to the week's real events once the hub has enough of them.
 */
const EVENT_STICKERS_PER_DAY = [2, 3, 1, 3, 2, 2, 1];
/** Logo placement when no event has a usable cover: adds up to 9, Sunday stays empty. */
const COMMUNITY_STICKERS_PER_DAY = [1, 2, 1, 3, 1, 1, 0];
/** Formats Satori can decode; anything else (for example WebP) is skipped instead of failing the render. */
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/svg+xml"]);

async function fetchImageAsDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!SUPPORTED_IMAGE_TYPES.has(contentType)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

async function loadFonts(origin: string): Promise<OgFont[]> {
  const [latin, latinExt] = await Promise.all([
    fetch(`${origin}/fonts/geologica-medium.woff`).then((response) => response.arrayBuffer()),
    fetch(`${origin}/fonts/geologica-medium-ext.woff`).then((response) => response.arrayBuffer()),
  ]);
  return [
    { name: "Geologica", data: latin, weight: 500, style: "normal" },
    { name: "Geologica", data: latinExt, weight: 500, style: "normal" },
  ];
}

async function loadMark(origin: string) {
  const svg = await fetch(`${origin}/og/luhive-mark.svg`).then((response) => response.text());
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function formatCommunityCount(count: number): string | null {
  if (count <= 0) return null;
  if (count < 10) return String(count);
  return `${Math.floor(count / 10) * 10}+`;
}

/** Seeded shuffle (mulberry32), so a week always renders the same mix and the weekly cache stays honest. */
function shuffleForWeek<T>(items: T[], weekStart: Date): T[] {
  let seed = Math.floor(weekStart.getTime() / DAY_MS) >>> 0;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

/** Splits stickers over the week by `perDay`, repeating the pool when it runs short. */
function spreadOverWeek(stickers: HubOgSticker[], perDay: number[], weekDates: Date[]): HubOgWeekDay[] {
  let next = 0;
  return weekDates.map((date, index) => {
    const dayStickers = Array.from({ length: perDay[index] }, () => {
      const sticker = stickers[next % stickers.length];
      next += 1;
      return { ...sticker, key: `${sticker.key}-${next}` };
    });
    return {
      weekdayLetter: WEEKDAY_LETTERS[index],
      dayOfMonth: date.getUTCDate(),
      stickers: stickers.length > 0 ? dayStickers : [],
    };
  });
}

async function loadEventCoverStickers(supabase: Supabase, weekStart: Date): Promise<HubOgSticker[]> {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    listUpcomingHubEvents(supabase, now),
    listPastHubEvents(supabase, now),
  ]);
  // Events often reuse a poster, so one cover counts once.
  const byCover = new Map(
    [...upcoming.events, ...past.events]
      .filter((event) => event.coverUrl)
      .map((event) => [event.coverUrl, event] as const),
  );
  // Event series reuse one poster design, so each community gets a turn before any gets a second.
  const shuffled = shuffleForWeek([...byCover.values()], weekStart);
  const seenCommunities = new Set<string>();
  const firstPerCommunity = shuffled.filter((event) => {
    if (seenCommunities.has(event.communitySlug)) return false;
    seenCommunities.add(event.communitySlug);
    return true;
  });
  const candidates = [...firstPerCommunity, ...shuffled.filter((event) => !firstPerCommunity.includes(event))];
  const needed = EVENT_STICKERS_PER_DAY.reduce((total, count) => total + count, 0);

  // Parallel batches keep the first render under crawler timeouts; a few extras cover unreadable images.
  const stickers: HubOgSticker[] = [];
  // The same poster is sometimes uploaded twice under different URLs, so compare the bytes too.
  const usedImages = new Set<string>();
  for (let start = 0; start < candidates.length && stickers.length < needed; start += COVER_BATCH_SIZE) {
    const batch = candidates.slice(start, start + COVER_BATCH_SIZE);
    const images = await Promise.all(batch.map((event) => fetchImageAsDataUrl(event.coverUrl)));
    batch.forEach((event, index) => {
      const imageSrc = images[index];
      if (!imageSrc || usedImages.has(imageSrc) || stickers.length >= needed) return;
      usedImages.add(imageSrc);
      stickers.push({ key: event.id, imageSrc, fallbackLabel: event.communityName });
    });
  }
  return stickers;
}

async function loadCommunityStickers(supabase: Supabase): Promise<HubOgSticker[]> {
  const { communities } = await getVisibleCommunities(supabase);
  const largest = [...communities]
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, COMMUNITY_STICKERS_PER_DAY.reduce((total, count) => total + count, 0));

  return Promise.all(
    largest.map(async (community) => ({
      key: community.id,
      imageSrc: await fetchImageAsDataUrl(community.logo_url),
      fallbackLabel: community.name,
    })),
  );
}

export async function loadHubOgAssets(
  supabase: Supabase,
  origin: string,
  weekStart: Date,
): Promise<HubOgAssets> {
  const weekDates = Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * DAY_MS));

  const [fonts, markSrc, preview, eventStickers] = await Promise.all([
    loadFonts(origin),
    loadMark(origin),
    getHubPreview(supabase),
    loadEventCoverStickers(supabase, weekStart),
  ]);

  const days =
    eventStickers.length > 0
      ? spreadOverWeek(eventStickers, EVENT_STICKERS_PER_DAY, weekDates)
      : spreadOverWeek(await loadCommunityStickers(supabase), COMMUNITY_STICKERS_PER_DAY, weekDates);

  return {
    fonts,
    markSrc,
    communityCountLabel: formatCommunityCount(preview?.communityCount ?? 0),
    days,
  };
}
