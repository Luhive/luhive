import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "~/shared/lib/public-env";
import { Database } from "~/shared/models/database.types";

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

function createClient() {
  if (typeof window === "undefined") {
    throw new Error("Supabase client requires browser environment");
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return supabaseClient;
}

export { createClient };
