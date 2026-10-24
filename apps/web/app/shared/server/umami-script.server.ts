const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";

/** Replaces the Netlify rewrite of `/stats.js`. */
export async function loader() {
  const response = await fetch(UMAMI_SCRIPT_URL, {
    signal: AbortSignal.timeout(5_000),
  });
  const headers = new Headers();
  const type = response.headers.get("Content-Type");
  headers.set("Content-Type", type ?? "application/javascript; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(response.body, { status: response.status, headers });
}
