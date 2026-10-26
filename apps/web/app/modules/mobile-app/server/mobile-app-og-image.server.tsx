import { ogFactory } from "~/shared/lib/og/og-factory";
import type { OgFont } from "~/shared/lib/og/og-types";

const DAY_SECONDS = 24 * 60 * 60;
const CACHE_HEADERS: Record<string, string> = {
  "Content-Type": "image/png",
  "Cache-Control": `public, max-age=${DAY_SECONDS}`,
  "CDN-Cache-Control": `public, max-age=${DAY_SECONDS}`,
};
const FALLBACK_IMAGE = "/ogimage.png";

/** The image never changes between deploys, so one rendering per server instance. */
let rendering: Promise<ArrayBuffer> | null = null;

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

async function render(origin: string): Promise<ArrayBuffer> {
  const [fonts, markSrc] = await Promise.all([loadFonts(origin), loadMark(origin)]);
  const response = await ogFactory.render(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F6F4F1",
        fontFamily: "Geologica",
        color: "#141414",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 56 }}>
        <img src={markSrc} width={40} height={40} alt="" />
        <span style={{ fontSize: 44, letterSpacing: -1.5 }}>Luhive</span>
      </div>
      <div style={{ display: "flex", fontSize: 88, letterSpacing: -3, lineHeight: 1.1 }}>
        <span>Luhive&nbsp;</span>
        <span style={{ color: "#FF6D23" }}>mobile apps</span>
      </div>
      <div style={{ display: "flex", fontSize: 88, letterSpacing: -3, lineHeight: 1.1 }}>
        on the way
      </div>
      <div style={{ display: "flex", marginTop: 48, fontSize: 30, color: "#6b6b6b" }}>
        Be the first to know when it's ready
      </div>
    </div>,
    { fonts },
  );
  if (!response.ok) throw new Error(`Mobile app OG render failed with status ${response.status}`);
  return response.arrayBuffer();
}

/** Share image for luhive.com/app: the hero title on the landing background. */
export async function generateMobileAppOgImage(origin: string): Promise<Response> {
  rendering ??= render(origin);
  try {
    return new Response(await rendering, { headers: CACHE_HEADERS });
  } catch (error) {
    rendering = null;
    console.error("Failed to generate mobile app OG image:", error);
    const bytes = await fetch(`${origin}${FALLBACK_IMAGE}`).then((response) => response.arrayBuffer());
    return new Response(bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" } });
  }
}
