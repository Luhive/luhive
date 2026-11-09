import { createContext } from "react-router";
import type { createClient } from "~/shared/lib/supabase/server";

type AuthUser = {
  id: string;
  email?: string;
  /** Sign-in provider from the token's app_metadata, e.g. "email" or "google". */
  provider?: string;
};

type RequestSupabase = {
  supabase: ReturnType<typeof createClient>["supabase"];
  /** Resolved once per request from the verified access token and shared by every loader and action. */
  findAuthUser: () => Promise<AuthUser | null>;
};

/** Set by `supabaseMiddleware` in root.tsx; reading it without the middleware throws. */
export const requestSupabaseContext = createContext<RequestSupabase>();
