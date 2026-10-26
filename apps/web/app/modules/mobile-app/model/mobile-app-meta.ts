const MOBILE_APP_CANONICAL_URL = "https://luhive.com/app";
const MOBILE_APP_OG_IMAGE_URL = "https://luhive.com/api/og/app";

export function meta() {
  const title = "Luhive mobile apps on the way";
  const description = "Be the first to know when the Luhive mobile apps are ready.";

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: MOBILE_APP_CANONICAL_URL },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Luhive" },
    { property: "og:image", content: MOBILE_APP_OG_IMAGE_URL },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: title },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: MOBILE_APP_OG_IMAGE_URL },
    { tagName: "link", rel: "canonical", href: MOBILE_APP_CANONICAL_URL },
  ];
}
