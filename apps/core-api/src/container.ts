import { createClient } from "@supabase/supabase-js";
import { createNodeClient } from "@luhive/db/node";
import type { CoreEnv } from "./env";
import { recordQuery } from "./lib/db-usage";
import { createLogger } from "./lib/logger";

/**
 * Creates a container for the application.
 * This is a singleton that is used to store the application's dependencies.
 * @param env - The environment variables.
 * @returns The container.
 */

export function createContainer(env: CoreEnv) {
  const logger = createLogger(env);
  const db = createNodeClient(
    {
      connectionString: env.DATABASE_URL,
      max: env.DB_POOL_MAX,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
    },
    // Duration only. The query text and its parameters are not logged: they
    // carry member emails and other personal data.
    (event) => recordQuery(event.queryDurationMillis),
  );
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return {
    db,
    env,
    logger,
    supabase,
    verifyToken: async (token: string) =>
      (await supabase.auth.getUser(token)).data.user?.id ?? null,
    async close() {
      await db.destroy();
    },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
