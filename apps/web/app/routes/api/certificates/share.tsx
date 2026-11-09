import type { ActionFunctionArgs } from "react-router";
import * as Certificate from "~/modules/certificates/model/certificate";
import * as Certificates from "~/modules/certificates/data/certificates-repo.server";

// Sent with navigator.sendBeacon when the owner presses a share action. Counts only:
// the code, which action. Always 204, so the page never waits on it or shows an error.
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData().catch(() => null);
  const code = String(form?.get("code") ?? "").toLowerCase();
  const channel = String(form?.get("channel") ?? "");
  if (/^[a-z0-9]{10}$/.test(code) && Certificate.isShareChannel(channel)) {
    // The foreign key turns an unknown code into a logged error, not a stray row.
    await Certificates.recordEvent(code, "share", channel);
  }
  return new Response(null, { status: 204 });
}
