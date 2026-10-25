export { loader } from "~/modules/mobile-app/server/mobile-app-loader.server";
export { action } from "~/modules/mobile-app/server/mobile-app-action.server";
export { meta } from "~/modules/mobile-app/model/mobile-app-meta";

import { Link, useActionData, useLoaderData } from "react-router";
import { Check } from "lucide-react";
import { Routes } from "~/shared/lib/routing/routes";
import { MobileAppWaitlistForm } from "~/modules/mobile-app/components/mobile-app-waitlist-form";
import type { MobileAppLoaderData } from "~/modules/mobile-app/server/mobile-app-loader.server";
import type { MobileAppActionData } from "~/modules/mobile-app/server/mobile-app-action.server";

// Reached only from a LinkedIn post comment; deliberately not linked from navigation.
// Nav and hero follow the landing page (LandingNavbar, LandingAbout) one to one.
export default function MobileAppPage() {
  const { user, alreadyJoined, utm } = useLoaderData<MobileAppLoaderData>();
  const actionData = useActionData<MobileAppActionData>();
  const joined = alreadyJoined || actionData?.success === true;

  return (
    <div className="min-h-screen bg-[#F6F4F1]">
      <nav className="fixed inset-x-0 top-0 z-50 flex h-14 flex-col items-end border-foreground/10 bg-[#F6F4F1]/60 px-4 backdrop-blur-md backdrop-saturate-150 md:left-1/2 md:right-auto md:top-6 md:my-2 md:h-auto md:min-h-14 md:w-[600px] md:-translate-x-1/2 md:justify-center md:rounded-full md:border md:px-0">
        <div className="flex h-full w-full items-center justify-between md:h-auto md:px-3 md:py-2">
          <Link
            to={Routes.landing}
            aria-label="Luhive home"
            className="flex shrink-0 select-none rounded-full px-2 py-1 transition-colors hover:bg-black/[0.04]"
          >
            <img
              src="/landing/DesktopLogo.svg"
              alt=""
              aria-hidden
              className="h-[1.1rem] w-auto shrink-0 object-contain"
              width={94}
              height={19}
            />
          </Link>
          <Link
            to={Routes.landing}
            className="whitespace-nowrap rounded-full border border-foreground/6 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
          >
            luhive.com
          </Link>
        </div>
      </nav>

      <section className="pb-16 pt-32 md:pt-28 lg:pb-24 lg:pt-36">
        <div className="mx-auto w-[95vw] text-center 3xl:w-[60rem]">
          <h1 className="mb-6 text-3xl font-semibold tracking-tight text-foreground max-md:leading-snug md:mb-8 md:text-4xl md:leading-tight lg:text-5xl xl:text-6xl">
            <span className="block">
              Luhive{" "}
              <span className="inline-block align-baseline font-semibold tracking-tight text-primary md:leading-tight">
                mobile apps
              </span>
            </span>
            <span className="block">on the way</span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-sm leading-relaxed text-muted-foreground md:mb-10 lg:text-lg">
            Tədbirlər, biletlər və icmalarınız bir yerdə, telefonunuzda. Hazır
            olanda ilk xəbər tutanlardan olun.
          </p>

          {joined ? (
            <div className="flex flex-col items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-[0px_2px_8px_rgba(255,109,35,0.4),0px_1px_2px_rgba(0,0,0,0.06)]">
                <Check className="size-6" aria-hidden />
              </span>
              <p className="text-lg font-semibold text-foreground">Siyahıdasınız</p>
              <p className="text-sm text-muted-foreground lg:text-base">
                Tətbiq hazır olanda sizə ilk xəbər verəcəyik.
              </p>
            </div>
          ) : (
            <MobileAppWaitlistForm user={user} utm={utm} error={actionData?.error} />
          )}
        </div>
      </section>
    </div>
  );
}
