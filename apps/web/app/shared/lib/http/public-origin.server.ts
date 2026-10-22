/**
 * The address the visitor used. Behind Cloudflare the app receives plain HTTP, so
 * `request.url` is `http://luhive.com/...`. Supabase only accepts the https address
 * and otherwise sends the person to the site root.
 */
export function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  return `${forwardedProtocol(request)}://${url.host}`;
}

function forwardedProtocol(request: Request): "http" | "https" {
  const visitor = request.headers.get("cf-visitor");
  if (visitor) {
    try {
      const scheme = JSON.parse(visitor).scheme;
      if (scheme === "https" || scheme === "http") return scheme;
    } catch {
      // Ignore a malformed header and try the next source.
    }
  }

  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded === "https" || forwarded === "http") return forwarded;

  return new URL(request.url).protocol === "https:" ? "https" : "http";
}
