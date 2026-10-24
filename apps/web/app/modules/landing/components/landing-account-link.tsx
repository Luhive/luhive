import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/shared/components/ui/avatar";
import { Routes } from "~/shared/lib/routing/routes";
import { cn } from "~/shared/lib/utils/cn";

type LandingAccountLinkProps = {
  fullName: string | null;
  avatarUrl: string | null;
  /** Matches the Book a Call pill it replaces, which turns orange once the page scrolls. */
  scrolled: boolean;
};

function getNameInitials(fullName: string | null) {
  if (!fullName) return "";
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Signed-in visitors already have a community, so the navbar offers their profile instead of Book a Call. */
export function LandingAccountLink({ fullName, avatarUrl, scrolled }: LandingAccountLinkProps) {
  const { t } = useTranslation("landing");

  return (
    <Link
      to={Routes.profile}
      prefetch="intent"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium py-2 px-3 md:ml-1 rounded-full border border-foreground/6 hover:bg-foreground/5 transition-colors text-sm whitespace-nowrap select-none text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
        scrolled &&
          "border-primary bg-primary text-white shadow-sm transition-all duration-300 ease-out hover:border-primary/90 hover:bg-primary/90 hover:text-white",
      )}
    >
      <Avatar className={cn("size-5 shrink-0", scrolled && "ring-2 ring-white/90")}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="bg-[#efeae4] text-[9px] font-medium text-foreground">
          {getNameInitials(fullName) || "•"}
        </AvatarFallback>
      </Avatar>
      {t("navV2.yourProfile")}
    </Link>
  );
}
