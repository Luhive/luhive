/** /hubv2 is a design comparison of /hub, so it stays out of search results. */
export function meta() {
  return [
    { title: "Luhive Hub | Explore Communities and Events" },
    {
      name: "description",
      content: "Explore communities and upcoming events on the Luhive Hub.",
    },
    { name: "robots", content: "noindex, nofollow" },
    // The page is always white, so one value covers both color schemes.
    { name: "theme-color", content: "#ffffff" },
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
