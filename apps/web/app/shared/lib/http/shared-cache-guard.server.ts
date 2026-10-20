import type { MiddlewareFunction } from "react-router";

function isSharedCacheable(headers: Headers) {
  const cacheControl = headers.get("Cache-Control") ?? "";
  return headers.has("CDN-Cache-Control") || /\b(public|s-maxage)\b/.test(cacheControl);
}

/**
 * A response that sets a cookie belongs to one visitor. Whatever caching a route asked for,
 * such a response must never be stored by a CDN. Runs outermost, so it also sees cookies
 * added by inner middleware such as the Supabase session refresh.
 */
export const sharedCacheGuardMiddleware: MiddlewareFunction<Response> = async (_args, next) => {
  const response = await next();
  if (response.headers.getSetCookie().length === 0 || !isSharedCacheable(response.headers)) {
    return response;
  }

  response.headers.delete("CDN-Cache-Control");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};
