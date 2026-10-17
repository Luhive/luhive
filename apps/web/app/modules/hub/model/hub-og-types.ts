import type { OgFont } from "~/shared/lib/og/og-types";

/** A sticker on the week card: an event cover, or a community logo when no event has a cover. */
export type HubOgSticker = {
  key: string;
  /** Image inlined as a data URL, so the renderer never fetches during layout. */
  imageSrc: string | null;
  fallbackLabel: string;
};

export type HubOgWeekDay = {
  weekdayLetter: string;
  dayOfMonth: number;
  stickers: HubOgSticker[];
};

export type HubOgAssets = {
  fonts: OgFont[];
  markSrc: string;
  communityCountLabel: string | null;
  days: HubOgWeekDay[];
};
