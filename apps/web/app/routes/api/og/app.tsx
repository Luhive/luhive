import type { LoaderFunctionArgs } from "react-router";
import { generateMobileAppOgImage } from "~/modules/mobile-app/server/mobile-app-og-image.server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return generateMobileAppOgImage(publicOrigin(request));
}
