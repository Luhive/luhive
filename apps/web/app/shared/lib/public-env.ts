import type { PublicEnv } from "~/shared/models/public-env";

const EMPTY_PUBLIC_ENV: PublicEnv = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  googleMapsApiKey: "",
};

/**
 * Read at request time on the server and from `window.ENV` in the browser. Never read these
 * through `import.meta.env`: that compiles them into the bundle at build time and ties the
 * image to one environment.
 */
export function getPublicEnv(): PublicEnv {
  if (typeof window !== "undefined") return window.ENV ?? EMPTY_PUBLIC_ENV;

  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? "",
    googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  };
}
