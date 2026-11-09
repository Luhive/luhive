import type { OgFont } from "~/shared/lib/og/og-types";

const LUHIVE_MARK = "/og/luhive-mark.svg";

// Warm-function caches keyed by origin (fonts/mark are immutable per deploy).
const fontsCache = new Map<string, Promise<OgFont[]>>();
const markCache = new Map<string, Promise<string>>();

/** Geologica 500, Latin + Latin Extended (Azerbaijani letters). */
export function loadOgFonts(origin: string): Promise<OgFont[]> {
  let cached = fontsCache.get(origin);
  if (!cached) {
    cached = Promise.all([
      fetch(`${origin}/fonts/geologica-medium.woff`).then((r) => r.arrayBuffer()),
      fetch(`${origin}/fonts/geologica-medium-ext.woff`).then((r) => r.arrayBuffer()),
    ]).then(([latin, latinExt]) => [
      { name: "Geologica", data: latin, weight: 500, style: "normal" } as OgFont,
      { name: "Geologica", data: latinExt, weight: 500, style: "normal" } as OgFont,
    ]);
    fontsCache.set(origin, cached);
  }
  return cached;
}

/** The Luhive mark as a data URL, ready for an <img> in an OG template. */
export function loadOgMark(origin: string): Promise<string> {
  let cached = markCache.get(origin);
  if (!cached) {
    cached = fetch(`${origin}${LUHIVE_MARK}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => `data:image/svg+xml;base64,${Buffer.from(buf).toString("base64")}`);
    markCache.set(origin, cached);
  }
  return cached;
}

export function truncateOgText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
