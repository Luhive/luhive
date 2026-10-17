import type { MiddlewareFunction } from "react-router";
import type { User } from "@supabase/supabase-js";
import { createClient } from "~/shared/lib/supabase/server";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

const SUPABASE_COOKIE_PREFIX = "sb-";

function listCookieNames(setCookieHeaders: string[]) {
  return setCookieHeaders.map((header) => header.slice(0, header.indexOf("=")));
}

/**
 * One Supabase client per request. Refreshed session cookies are attached to the
 * response, unless a route already set its own session cookies (login, logout, verify).
 */
export const supabaseMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const { supabase, headers } = createClient(request);

  let authUserPromise: Promise<User | null> | undefined;
  context.set(requestSupabaseContext, {
    supabase,
    findAuthUser: () =>
      (authUserPromise ??= supabase.auth
        .getUser()
        .then(({ data }) => data.user ?? null)),
  });

  // Refresh an expired session before loaders stream, while headers can still be set.
  await supabase.auth.getSession();

  const response = await next();

  const refreshedCookies = headers.getSetCookie();
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
