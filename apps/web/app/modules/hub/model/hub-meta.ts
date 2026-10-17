import { formatHubOgWeekKey } from "~/modules/hub/utils/hub-og-week";

const HUB_CANONICAL_URL = "https://luhive.com/hub";

export function meta() {
  // A new URL each ISO week makes link previews pick up the new week's image.
  const ogImageUrl = `https://luhive.com/api/og/hub/${formatHubOgWeekKey(new Date())}`;
  const title = "Luhive Hub | Explore Communities and Events";
  const description = "Explore communities and upcoming events on the Luhive Hub.";

  const keywords = [
    "Luhive",
    "Luhive communities",
    "founder communities",
    "startup networking",
    "tech communities",
    "community discovery",
    "events",
  ].join(", ");

  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    {
      name: "robots",
      content:
        "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    },
    // The page has no dark scheme.
    { name: "theme-color", content: "#ffffff" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: HUB_CANONICAL_URL },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Luhive" },
    { property: "og:image", content: ogImageUrl },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "See what's on this week on the Luhive Hub" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImageUrl },
    { tagName: "link", rel: "canonical", href: HUB_CANONICAL_URL },
  ];
}

export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Geologica:wght@500&family=Inter:wght@400;500;600&display=swap",
    },
  ];
}
