import { FAQ } from "~/modules/mobile-app/model/mobile-app-content";

const SITE_URL = "https://luhive.com";
const PAGE_URL = `${SITE_URL}/app`;
const OG_IMAGE_URL = `${SITE_URL}/api/og/app`;
const LOGO_URL = `${SITE_URL}/LuhiveLogo.png`;

const TITLE = "Luhive Mobile App for iPhone and Android – Join the Waitlist";
const DESCRIPTION =
  "The Luhive mobile app is on the way: event notifications, QR tickets and new events from your communities, on iPhone and Android. Join the waitlist to hear first.";

/**
 * Structured data for /app. Deliberately no MobileApplication/SoftwareApplication node:
 * Google's app rich result needs ratings and an offer, which an unreleased app cannot
 * honestly give, and Search Console would report the item as invalid. The FAQ mirrors
 * the visible FAQ section word for word.
 */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Luhive",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: LOGO_URL },
      sameAs: [
        "https://www.linkedin.com/company/luhive",
        "https://twitter.com/luhive_",
        "https://instagram.com/luhive",
        "https://t.me/luhive",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Luhive",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      primaryImageOfPage: { "@type": "ImageObject", url: OG_IMAGE_URL, width: 1200, height: 630 },
      breadcrumb: { "@id": `${PAGE_URL}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Luhive", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Mobile app", item: PAGE_URL },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      isPartOf: { "@id": `${PAGE_URL}#webpage` },
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export function meta() {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    {
      name: "robots",
      content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    },
    { name: "author", content: "Luhive" },
    { name: "theme-color", content: "#FF6D23" },
    { tagName: "link", rel: "canonical", href: PAGE_URL },

    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Luhive" },
    { property: "og:locale", content: "en_US" },
    { property: "og:url", content: PAGE_URL },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:image", content: OG_IMAGE_URL },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "Luhive mobile app on the way" },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@luhive_" },
    { name: "twitter:title", content: TITLE },
    { name: "twitter:description", content: DESCRIPTION },
    { name: "twitter:image", content: OG_IMAGE_URL },
    { name: "twitter:image:alt", content: "Luhive mobile app on the way" },

    { "script:ld+json": STRUCTURED_DATA },
  ];
}
