/** /hub-legacy keeps the previous hub reachable; /hub is the page search engines should index. */
export function meta() {
  return [
    { title: "Luhive Hub (legacy) | Discover Communities" },
    {
      name: "description",
      content: "Discover curated communities, founders, and events on the Luhive Hub.",
    },
    { name: "robots", content: "noindex, follow" },
    { tagName: "link", rel: "canonical", href: "https://luhive.com/hub" },
  ];
}
