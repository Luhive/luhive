import type { LoaderFunctionArgs } from "react-router";
import { generateCertificateOgImage } from "~/modules/certificates/server/certificate-og-image.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const format = new URL(request.url).searchParams.get("format") === "story" ? "story" : "card";
  return generateCertificateOgImage(request, params.code, format);
}
