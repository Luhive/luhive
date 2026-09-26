import { useTranslation } from "react-i18next";

import { BookACallButton } from "./book-a-call-button";
import { DiscoverCommunitiesLink } from "./discover-communities-link";
import { LandingHeroDashboard } from "./landing-hero-dashboard";

export function LandingAbout() {
  const { t } = useTranslation('landing');

  return (
    <section
      id="about"
      className="bg-[#F6F4F1] pt-32 pb-12 md:pt-28 lg:pt-36 lg:pb-20"
    >
      <div className="mx-auto w-[95vw] 3xl:w-[60rem] text-center">
        <h2 className="mb-6 md:mb-8 tracking-tight font-semibold text-foreground max-md:leading-snug md:leading-tight text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
          <span className="block">{t("hero.title")}</span>
          <span className="block text-foreground">
            {t("hero.titleHighlight")}{" "}
            <span className="inline-block font-semibold align-baseline tracking-tight text-primary md:leading-tight">
              {" "}
              {t("about.communities")}
            </span>
          </span>
        </h2>

        <p className="mx-auto mb-8 md:mb-10 max-w-3xl text-sm lg:text-lg leading-relaxed text-muted-foreground">
          {t("hero.subtitle")}
        </p>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-4">
            <BookACallButton />
            <div
              aria-hidden
              className="flex items-center gap-3 text-xs text-muted-foreground/70"
            >
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-foreground/25" />
              {t("hero.ctaSeparator")}
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-foreground/25" />
            </div>
            <DiscoverCommunitiesLink />
          </div>

          <div className="mx-auto mt-5 md:mt-0 w-full overflow-hidden">
            <LandingHeroDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}


