import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AnalyticsEvents } from "~/shared/lib/analytics";
import { Routes } from "~/shared/lib/routing/routes";

const MEMBER_AVATARS = [
  { src: "/landing/features/feature-avatar-1.svg", fanClassName: "" },
  {
    src: "/landing/features/feature-avatar-2.svg",
    fanClassName: "[@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1",
  },
  {
    src: "/landing/features/feature-avatar-3.svg",
    fanClassName: "[@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-2",
  },
];

export function DiscoverCommunitiesLink() {
  const { t } = useTranslation("landing");

  return (
    <Link
      to={Routes.hub}
      prefetch="intent"
      data-umami-event="hero_hub_clicked"
      onClick={() => AnalyticsEvents.discoverHubClick("Hero")}
      className="group inline-flex items-center gap-2.5 rounded-full border border-foreground/8 bg-white/50 py-1 pl-1 pr-3.5 text-sm font-medium text-muted-foreground transition-[color,background-color,border-color,transform] duration-150 ease-out hover:border-foreground/15 hover:bg-white hover:text-foreground active:scale-[0.97]"
    >
      <span className="flex -space-x-2" aria-hidden>
        {MEMBER_AVATARS.map((avatar) => (
          <img
            key={avatar.src}
            src={avatar.src}
            alt=""
            className={`size-6 rounded-full bg-white object-cover ring-2 ring-white transition-transform duration-200 ease-out ${avatar.fanClassName}`}
          />
        ))}
      </span>
      <span className="transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1">
        {t("hero.ctaDiscover")}
      </span>
      <ArrowRight
        aria-hidden
        className="size-3.5 transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1.5"
      />
    </Link>
  );
}
