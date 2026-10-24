/** A page rendered with any of these cookies differs per visitor and must never be stored in a shared cache. */
const PERSONALISING_COOKIES = [/^sb-/, /^lh_first_touch$/];

const NOT_SHARED: HeadersInit = { "Cache-Control": "private, no-store" };

function hasPersonalisingCookie(request: Request) {
  const header = request.headers.get("Cookie");
  if (!header) return false;

  return header.split(";").some((pair) => {
    const name = pair.trim().split("=")[0] ?? "";
    return PERSONALISING_COOKIES.some((pattern) => pattern.test(name));
  });
}

/**
 * The CDN keeps the page for five minutes; browsers revalidate on every visit, so a deploy
 * reaches everyone within minutes. If a CDN ignores `CDN-Cache-Control`, `max-age=0` makes
 * the page uncached rather than wrongly cached.
 */
export function sharedPageCacheHeaders(request: Request): HeadersInit {
  if (hasPersonalisingCookie(request)) return NOT_SHARED;

  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control": "max-age=300, stale-while-revalidate=600",
  };
}

export function uncachedHeaders(): HeadersInit {
  return NOT_SHARED;
}
