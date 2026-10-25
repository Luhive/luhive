const MOBILE_APP_CANONICAL_URL = "https://luhive.com/app";

export function meta() {
  const title = "Luhive mobile apps on the way";
  const description =
    "Be the first to know when the Luhive mobile apps are ready.";

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: MOBILE_APP_CANONICAL_URL },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Luhive" },
    { tagName: "link", rel: "canonical", href: MOBILE_APP_CANONICAL_URL },
  ];
}
