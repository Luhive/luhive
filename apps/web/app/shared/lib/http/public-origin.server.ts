/**
 * The public site address. Behind Cloudflare `request.url` is `http://`, so links
 * built from it are rejected or look broken. `APP_URL` is the address visitors use.
 * Locally it is unset and the request origin is correct.
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}
