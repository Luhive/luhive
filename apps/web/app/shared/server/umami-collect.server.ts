const UMAMI_COLLECT_URL = "https://cloud.umami.is/api/send";
const STRIPPED_HEADERS = ["host", "cookie", "x-forwarded-for", "x-forwarded-host"];

// Umami decodes location headers as latin1 bytes, so pass UTF-8 bytes verbatim.
function toHeaderValue(value: string) {
  return String.fromCharCode(...new TextEncoder().encode(value));
}

/**
 * Replaces the Netlify edge function. Cloudflare supplies the visitor IP and,
 * once location headers are enabled, the city and region.
 */
export async function collectUmami(request: Request) {
  const headers = new Headers(request.headers);
  for (const name of STRIPPED_HEADERS) headers.delete(name);

  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers.set("x-umami-client-ip", ip);

  const country = request.headers.get("cf-ipcountry");
  if (country) headers.set("x-umami-client-country", country);

  const region = request.headers.get("cf-region-code") ?? request.headers.get("cf-region");
  if (region) headers.set("x-umami-client-region", region);

  const city = request.headers.get("cf-ipcity");
  if (city) headers.set("x-umami-client-city", toHeaderValue(city));

  return fetch(UMAMI_COLLECT_URL, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
  });
}
