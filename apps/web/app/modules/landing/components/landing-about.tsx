import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type { LandingHubPreview } from "~/modules/landing/model/landing-hub-preview";
import * as LandingAnalytics from "~/modules/landing/utils/landing-analytics";
import { Routes } from "~/shared/lib/routing/routes";

import { BookACallButton } from "./book-a-call-button";
import { DiscoverCommunitiesLink } from "./discover-communities-link";
import { LandingHeroDashboard } from "./landing-hero-dashboard";

type LandingAboutProps = {
  hubPreview: LandingHubPreview | null;
};

export function LandingAbout({ hubPreview }: LandingAboutProps) {
  const { t } = useTranslation('landing');

  return (
    <section
      id="about"
      className="bg-[#F6F4F1] pt-32 pb-12 md:pt-28 lg:pt-36 lg:pb-20"
    >
      <div className="mx-auto w-[95vw] 3xl:w-[60rem] text-center">
        <Link
          to={Routes.profile}
          onClick={() => LandingAnalytics.trackProfileClaimClicked()}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-white/80 py-1 pl-1 pr-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-foreground/20 active:scale-[0.98]"
        >
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            {t("hero.newBadge")}
          </span>
          <span className="claim-profile-shimmer">{t("hero.newProfile")}</span>
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <h2 className="mb-6 text-balance text-[clamp(2.75rem,6.5vw,3.75rem)] font-semibold leading-[1.1] tracking-tight text-foreground md:mb-8">
          {t("hero.title")}{" "}
          <span className="text-primary">{t("hero.titleHighlight")}</span>
        </h2>

        <p className="mx-auto mb-8 md:mb-10 max-w-3xl text-sm lg:text-lg leading-relaxed text-muted-foreground">
          {t("hero.subtitle")}
        </p>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2.5">
              <BookACallButton />
              <p className="max-w-xs text-sm leading-snug text-muted-foreground">
                {t("hero.ctaSetupNote")}
              </p>
            </div>
            <div
              aria-hidden
              className="flex items-center gap-3 text-xs text-muted-foreground/70"
            >
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-foreground/25" />
              {t("hero.ctaSeparator")}
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-foreground/25" />
            </div>
            <DiscoverCommunitiesLink hubPreview={hubPreview} />
          </div>

          <div className="mx-auto mt-5 md:mt-0 w-full overflow-hidden">
            <LandingHeroDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}


