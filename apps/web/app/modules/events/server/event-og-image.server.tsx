import type { ReactNode } from "react";
import { createClient } from "~/shared/lib/supabase/server";
import { resolvePublicEvent } from "~/modules/events/server/resolve-public-event.server";
import {
  ogFactory,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from "~/shared/lib/og/og-factory";
import type { OgFont } from "~/shared/lib/og/og-types";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

const IMAGE_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "Content-Type": "image/png",
};

// Safe-zone inset — keeps text/branding clear of edges platforms may crop.
const SAFE_X = 70;

// Exact colors sampled from the Figma design (node 2392:96).
const TITLE_ORANGE = "#e7500a";
const COMMUNITY_BLACK = "#000000";
const LUHIVE_INK = "#141414";

const DEFAULT_OG_IMAGE = "/ogimage.png";
const LUHIVE_FALLBACK_COVER = "/LuhiveLogoBackground.png";
const LUHIVE_MARK = "/og/luhive-mark.svg";

// Warm-function caches keyed by origin (fonts/mark are immutable per deploy).
const fontsCache = new Map<string, Promise<OgFont[]>>();
const markCache = new Map<string, Promise<string>>();

function loadFonts(origin: string): Promise<OgFont[]> {
  let cached = fontsCache.get(origin);
  if (!cached) {
    cached = Promise.all([
      fetch(`${origin}/fonts/geologica-medium.woff`).then((r) => r.arrayBuffer()),
      fetch(`${origin}/fonts/geologica-medium-ext.woff`).then((r) =>
        r.arrayBuffer(),
      ),
    ]).then(([latin, latinExt]) => [
      { name: "Geologica", data: latin, weight: 500, style: "normal" } as OgFont,
      {
        name: "Geologica",
        data: latinExt,
        weight: 500,
        style: "normal",
      } as OgFont,
    ]);
    fontsCache.set(origin, cached);
  }
  return cached;
}

function loadMark(origin: string): Promise<string> {
  let cached = markCache.get(origin);
  if (!cached) {
    cached = fetch(`${origin}${LUHIVE_MARK}`)
      .then((r) => r.arrayBuffer())
      .then(
        (buf) =>
          `data:image/svg+xml;base64,${Buffer.from(buf).toString("base64")}`,
      );
    markCache.set(origin, cached);
  }
  return cached;
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

async function fallbackImageResponse(origin: string): Promise<Response> {
  const buffer = await fetch(`${origin}${DEFAULT_OG_IMAGE}`).then((r) =>
    r.arrayBuffer(),
  );
  return new Response(buffer, { headers: IMAGE_CACHE_HEADERS });
}

interface EventOgTemplateProps {
  communityName: string;
  communityLogoUrl: string | null;
  eventTitle: string;
  coverUrl: string;
  markUrl: string;
}

function EventOgTemplate({
  communityName,
  communityLogoUrl,
  eventTitle,
  coverUrl,
  markUrl,
}: EventOgTemplateProps): ReactNode {
  return (
    <div
      style={{
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        display: "flex",
        position: "relative",
        backgroundColor: "#ffffff",
        fontFamily: "Geologica",
      }}
    >
      <img
        src={coverUrl}
        width={450}
        height={450}
        style={{
          position: "absolute",
          left: 680,
          top: 90,
          width: 450,
          height: 450,
          objectFit: "cover",
          borderRadius: 24,
          backgroundColor: "#d3d3d3",
          boxShadow: "0px 40px 50px -12px rgba(0,0,0,0.35)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          top: 237,
          width: 511,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8.889 }}>
          {communityLogoUrl ? (
            <div
              style={{
                display: "flex",
                width: 36,
                height: 36,
                overflow: "hidden",
              }}
            >
              <img
                src={communityLogoUrl}
                width={36}
                height={36}
                style={{ width: 36, height: 36, objectFit: "cover" }}
              />
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 500,
              color: COMMUNITY_BLACK,
              letterSpacing: -0.8,
              whiteSpace: "nowrap",
            }}
          >
            {communityName}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 44,
            fontWeight: 500,
            color: TITLE_ORANGE,
            letterSpacing: -1.76,
            lineHeight: 1.25,
          }}
        >
          {eventTitle}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          top: 522,
          display: "flex",
          alignItems: "center",
          gap: 4.235,
        }}
      >
        <img src={markUrl} width={26} height={26} style={{ width: 26, height: 26 }} />
        <div
          style={{
            display: "flex",
            fontSize: 25.412,
            fontWeight: 500,
            color: LUHIVE_INK,
            letterSpacing: -1.0165,
          }}
        >
          Luhive
        </div>
      </div>
    </div>
  );
}

/**
 * Render the custom OG image (1200x630) for a public event, or fall back to the
 * static site OG image when the event can't be resolved.
 */
export async function generateEventOgImage(
  request: Request,
  communitySlug: string | undefined,
  eventSlug: string | undefined,
): Promise<Response> {
  const origin = publicOrigin(request);

  try {
    if (!communitySlug || !eventSlug) {
      return fallbackImageResponse(origin);
    }

    const { supabase } = createClient(request);
    const resolved = await resolvePublicEvent(supabase, communitySlug, eventSlug, {
      publishedOnly: true,
    });

    if (!resolved) {
      return fallbackImageResponse(origin);
    }

    const { event, community } = resolved;
    const [fonts, markUrl] = await Promise.all([
      loadFonts(origin),
      loadMark(origin),
    ]);

    const coverUrl =
      event.cover_url ||
      community.logo_url ||
      `${origin}${LUHIVE_FALLBACK_COVER}`;

    return ogFactory.render(
      <EventOgTemplate
        communityName={truncate(community.name ?? "Community", 42)}
        communityLogoUrl={community.logo_url ?? null}
        eventTitle={truncate(event.title ?? "Event", 80)}
        coverUrl={coverUrl}
        markUrl={markUrl}
      />,
      { fonts, headers: IMAGE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Failed to generate event OG image:", error);
    return fallbackImageResponse(origin);
  }
}
