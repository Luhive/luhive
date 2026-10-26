import { useLoaderData, type ShouldRevalidateFunction } from "react-router";
import { useTranslation } from "react-i18next";

import "~/shared/lib/i18n";

export { loader } from "~/modules/mobile-app/server/mobile-app-loader.server";
export { action } from "~/modules/mobile-app/server/mobile-app-action.server";
export { meta } from "~/modules/mobile-app/model/mobile-app-meta";

import { LandingNavbar } from "~/modules/landing/components/landing-navbar";
import { LandingFooter } from "~/modules/landing/components/landing-footer";
import { WaitlistCard } from "~/modules/mobile-app/components/waitlist-card";
import { SubscribedCounter } from "~/modules/mobile-app/components/subscribed-counter";
import type { MobileAppLoaderData } from "~/modules/mobile-app/server/mobile-app-loader.server";

// The chip answer changes nothing the loader returns. Skipping the reload also
// stops the counter rolling a second time (M7 rolls once, on the visitor's signup).
export const shouldRevalidate: ShouldRevalidateFunction = ({ formData, defaultShouldRevalidate }) =>
  formData?.get("intent") === "answer" ? false : defaultShouldRevalidate;

// Spec: docs/mobile-app-waitlist.md. Nav, hero and footer match the landing page one to one.
export default function MobileAppPage() {
  const { user, joined, subscribedCount, utm } = useLoaderData<MobileAppLoaderData>();
  useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar sectionBase="/?home" trackActiveSection={false} />

      {/* At least one screen tall (svh, so mobile browser bars don't push it), so the footer starts below the fold. */}
      <section className="flex min-h-svh flex-col justify-center bg-[#F6F4F1] pt-32 pb-12 md:pt-28 lg:pt-36 lg:pb-20">
        <div className="mx-auto w-[95vw] 3xl:w-[60rem] text-center">
          <h1 className="mb-6 md:mb-8 tracking-tight font-semibold text-foreground max-md:leading-snug md:leading-tight text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            <span className="block">
              Luhive{" "}
              <span className="inline-block font-semibold align-baseline tracking-tight text-primary md:leading-tight">
                mobile apps
              </span>
            </span>
            <span className="block text-foreground">on the way</span>
          </h1>

          <p className="mx-auto mb-8 md:mb-10 max-w-3xl text-sm lg:text-lg leading-relaxed text-muted-foreground">
            Your events, tickets and communities in one place, on your phone. Be
            the first to know when it's ready.
          </p>

          {/* Above the card so it never moves when the card changes state. */}
          <div className="mb-5">
            <SubscribedCounter count={subscribedCount} />
          </div>

          <WaitlistCard user={user} joined={joined} utm={utm} />

          {/* Design slot: Ali's designs go here, where the dashboard sits on the landing page. */}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
