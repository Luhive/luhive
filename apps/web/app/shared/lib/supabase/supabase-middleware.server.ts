import type { MiddlewareFunction } from "react-router";
import { createClient } from "~/shared/lib/supabase/server";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

const SUPABASE_COOKIE_PREFIX = "sb-";

/**
 * Public responses cached by CDNs for every visitor. They get a signed-out client and no
 * session refresh, so one visitor's cookies can never be stored in a shared cache.
 */
const SESSIONLESS_PATH_PREFIXES = ["/api/og/"];

function isSessionlessRequest(request: Request) {
  const { pathname } = new URL(request.url);
  return SESSIONLESS_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function listCookieNames(setCookieHeaders: string[]) {
  return setCookieHeaders.map((header) => header.slice(0, header.indexOf("=")));
}

function hasSessionCookie(request: Request) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  return cookieHeader.split(";").some((cookie) => cookie.trim().startsWith(SUPABASE_COOKIE_PREFIX));
}

/**
 * Verifies the access token locally against the project's signing keys. Tokens signed
 * with the legacy shared secret are still checked by the Auth server.
 */
async function readAuthUser(supabase: ReturnType<typeof createClient>["supabase"]) {
  const { data } = await supabase.auth.getClaims();
  if (!data) return null;
  return { id: data.claims.sub, email: data.claims.email };
}

/**
 * One Supabase client per request, created on first use so routes that never touch Supabase
 * do no Supabase work. Refreshed
 * session cookies are attached to the response, unless a route set its own (login, logout, verify).
 */
export const supabaseMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const isSessionless = isSessionlessRequest(request);
  const canHaveSession = !isSessionless && hasSessionCookie(request);

  let client: ReturnType<typeof createClient> | undefined;
  const getClient = () => (client ??= createClient(isSessionless ? new Request(request.url) : request));

  let authUserPromise: ReturnType<typeof readAuthUser> | undefined;
  context.set(requestSupabaseContext, {
    get supabase() {
      return getClient().supabase;
    },
    findAuthUser: () =>
      (authUserPromise ??= canHaveSession ? readAuthUser(getClient().supabase) : Promise.resolve(null)),
  });

  // Refresh an expired session before loaders stream, while headers can still be set.
  if (canHaveSession) await getClient().supabase.auth.getSession();

  const response = await next();
  if (!client || isSessionless) return response;

  const refreshedCookies = client.headers.getSetCookie();
  if (refreshedCookies.length === 0) return response;

  const isSessionSetByRoute = listCookieNames(response.headers.getSetCookie()).some(
    (name) => name.startsWith(SUPABASE_COOKIE_PREFIX),
  );
  if (isSessionSetByRoute) return response;

  for (const cookie of refreshedCookies) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
};
