import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData, type HeadersFunction } from "react-router";

import { loader } from "~/modules/landing/server/landing-loader.server";
import "~/shared/lib/i18n";

export { meta } from "~/modules/landing/model/landing-meta";
export { loader };
export const headers: HeadersFunction = ({ loaderHeaders }) => loaderHeaders;
import { LandingNavbar } from "~/modules/landing/components/landing-navbar";
import { LandingAbout } from "~/modules/landing/components/landing-about";
import { LandingPartners } from "~/modules/landing/components/landing-partners";
import { LandingAcknowledgement } from "~/modules/landing/components/landing-acknowledgement";
import { LandingFeatures } from "~/modules/landing/components/landing-features";
import { LandingPricing } from "~/modules/landing/components/landing-pricing";
import { LandingFAQ } from "~/modules/landing/components/landing-faq";
import { LandingFooter } from "~/modules/landing/components/landing-footer";

export default function LandingPage() {
  const { hubPreview } = useLoaderData<typeof loader>();
  useTranslation();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <LandingAbout hubPreview={hubPreview} />
      <LandingPartners />
      <LandingAcknowledgement />
      <LandingFeatures />
      <LandingPricing />
      <LandingFAQ />
      <LandingFooter />
    </div>
  );
}
