import type { CSSProperties } from "react";
import { useLoaderData, useNavigation, type ShouldRevalidateFunction } from "react-router";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import { AndroidIcon, AppleIcon } from "@hugeicons/core-free-icons";
import luhiveMark from "~/assets/images/hub/luhive-mark.svg";

import "~/shared/lib/i18n";

export { loader } from "~/modules/mobile-app/server/mobile-app-loader.server";
export { action } from "~/modules/mobile-app/server/mobile-app-action.server";
export { meta } from "~/modules/mobile-app/model/mobile-app-meta";

import { LandingNavbar } from "~/modules/landing/components/landing-navbar";
import { LandingFooter } from "~/modules/landing/components/landing-footer";
import { WaitlistCard } from "~/modules/mobile-app/components/waitlist-card";
import { SubscribedCounter } from "~/modules/mobile-app/components/subscribed-counter";
import { HeroStickers } from "~/modules/mobile-app/components/hero-stickers";
import type { MobileAppLoaderData } from "~/modules/mobile-app/server/mobile-app-loader.server";

// The chip answer changes nothing the loader returns. Skipping the reload also
// stops the counter rolling a second time (M7 rolls once, on the visitor's signup).
export const shouldRevalidate: ShouldRevalidateFunction = ({ formData, defaultShouldRevalidate }) =>
  formData?.get("intent") === "answer" ? false : defaultShouldRevalidate;

// First-load entrance (M13): each hero piece rises in reading order, 60 ms apart
// (the skills' stagger recipe). The stickers follow once the hero has landed.
const heroStep = (i: number) => ({ "--hero-i": i }) as CSSProperties;

// Spec: docs/mobile-app-waitlist.md. Nav, hero and footer match the landing page one to one.
export default function MobileAppPage() {
  const { user, joined, subscribedCount, utm } = useLoaderData<MobileAppLoaderData>();
  // Optimistic counter: +1 while a join is in flight; the reload after it brings the real count.
  const navigation = useNavigation();
  const joinPending = navigation.formData?.get("intent") === "join";
  useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar sectionBase="/?home" trackActiveSection={false} />

      {/* At least one screen tall (svh, so mobile browser bars don't push it), so the footer
          starts below the fold. Centred on md+; on phones it starts under the navbar, since
          centring a short column in a tall screen leaves a big empty top. */}
      <section className="flex min-h-svh flex-col justify-start bg-[#F6F4F1] pt-24 pb-12 md:justify-center md:pt-28 lg:pt-36 lg:pb-20">
        <div className="relative mx-auto w-[95vw] 3xl:w-[60rem] text-center">
          <HeroStickers />

          {/* The Luhive mark as an app icon tile. A silver light sweeps around its border
              (motion M11), so it reads as live. */}
          <div className="hero-enter relative mx-auto mb-6 size-20 md:mb-8 md:size-24" style={heroStep(0)}>
            <div className="relative size-full overflow-hidden rounded-[1.375rem] p-[1.5px] shadow-[0px_8px_20px_rgba(0,0,0,0.08),0px_1px_2px_rgba(0,0,0,0.06)] md:rounded-[1.625rem]">
              <span aria-hidden className="app-icon-sweep absolute -inset-1/2 bg-[conic-gradient(from_0deg,#E4E4E4_0%,#E4E4E4_58%,#B8B8BC_72%,#FFFFFF_80%,#B8B8BC_88%,#E4E4E4_100%)]" />
              <div className="relative flex size-full items-center justify-center rounded-[calc(1.375rem-1.5px)] bg-gradient-to-b from-white to-[#ECECEC] shadow-[inset_0px_1px_0px_rgba(255,255,255,0.9)] md:rounded-[calc(1.625rem-1.5px)]">
                <img src={luhiveMark} alt="Luhive" width={56} height={56} className="size-12 md:size-14" />
              </div>
            </div>
          </div>

          <h1 className="mb-6 md:mb-8 tracking-tight font-semibold text-foreground max-md:leading-[1.05] md:leading-tight text-5xl lg:text-5xl xl:text-6xl">
            <span className="hero-enter block text-primary" style={heroStep(1)}>Mobile app</span>
            <span className="hero-enter block text-foreground" style={heroStep(2)}>on the way</span>
          </h1>

          <p className="mx-auto mb-8 md:mb-10 max-w-3xl text-sm lg:text-lg leading-relaxed text-muted-foreground">
            <span className="hero-enter block" style={heroStep(3)}>
              Your events, tickets and communities on your{" "}
              {/* Logos in brand colours (Apple black, Android dark green #15803D); sized optically (the Android outline needs a little more size to match the apple); they and "phone." never split across lines. */}
              <span className="whitespace-nowrap">
                <span className="inline-flex translate-y-[0.125em] items-center gap-1 text-foreground">
                  <HugeiconsIcon icon={AppleIcon} size="1.05em" color="#000000" strokeWidth={1.5} aria-label="iPhone" />
                  <HugeiconsIcon icon={AndroidIcon} size="1.12em" color="#15803D" strokeWidth={1.5} aria-label="Android" />
                </span>{" "}
                phone.
              </span>
            </span>
            <span className="hero-enter block" style={heroStep(4)}>Be the first to know when it's ready.</span>
          </p>

          <div className="hero-enter" style={heroStep(5)}>
            <WaitlistCard user={user} joined={joined} utm={utm} />
          </div>

          <div className="hero-enter mt-4" style={heroStep(6)}>
            <SubscribedCounter count={subscribedCount + (joinPending ? 1 : 0)} />
          </div>

          {/* Design slot: Ali's designs go here, where the dashboard sits on the landing page. */}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
