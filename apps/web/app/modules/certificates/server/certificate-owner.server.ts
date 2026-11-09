// import * as CertificateOwner from "~/modules/certificates/server/certificate-owner.server"
// Who sees a certificate's share actions: the signed-in recipient, or
// whoever holds the key from the recipient's email, so no account is needed.
import { createHmac, timingSafeEqual } from "node:crypto";

// Reuses the email-link secret, scoped by a prefix so the two signatures never collide.
function sign(code: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not set");
  return createHmac("sha256", secret).update(`certificate:${code}`).digest("hex").slice(0, 24);
}

/** The `?k=` value in the recipient's email link. */
export function key(code: string): string {
  return sign(code);
}

export function isOwner(input: {
  code: string;
  key: string | null;
  ownerId: string | null;
  viewerId: string | null;
}): boolean {
  if (input.viewerId && input.ownerId === input.viewerId) return true;
  if (!input.key) return false;
  const expected = Buffer.from(sign(input.code));
  const given = Buffer.from(input.key);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
