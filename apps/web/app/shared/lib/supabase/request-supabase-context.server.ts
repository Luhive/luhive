import { createContext } from "react-router";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "~/shared/lib/supabase/server";

type RequestSupabase = {
  supabase: ReturnType<typeof createClient>["supabase"];
  /** Resolved once per request and shared by every loader and action. */
  findAuthUser: () => Promise<User | null>;
};

/** Set by `supabaseMiddleware` in root.tsx; reading it without the middleware throws. */
export const requestSupabaseContext = createContext<RequestSupabase>();
