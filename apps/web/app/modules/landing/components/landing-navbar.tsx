import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Menu, X } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AppleIcon } from "@hugeicons/core-free-icons";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/shared/components/ui/avatar";
import { createClient } from '~/shared/lib/supabase/client';
import { useCalBookingUrl } from "~/shared/hooks/use-cal-booking-url";
import { Routes } from "~/shared/lib/routing/routes";
import { LandingAccountLink } from "~/modules/landing/components/landing-account-link";
import * as LandingAnalytics from "~/modules/landing/utils/landing-analytics";
import { cn } from "~/shared/lib/utils/cn";

interface UserData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const SOCIAL_LINKS = [
  {
    id: 'linkedin',
    icon: '/landing/Linkedin.svg',
    href: 'https://www.linkedin.com/company/luhive',
    label: 'LinkedIn',
  },
  {
    id: 'instagram',
    icon: '/landing/Instagram.svg',
    href: 'https://instagram.com/luhive',
    label: 'Instagram',
  },
];

type NavSectionId = "features" | "pricing" | "faqs";

type LandingNavbarProps = {
  /** Prefix for the section links when the navbar sits on another page, e.g. "/?home". */
  sectionBase?: string;
  /** Highlight the section in view. Off on pages that don't have the landing sections. */
  trackActiveSection?: boolean;
};

export function LandingNavbar({
  sectionBase = "",
  trackActiveSection = true,
}: LandingNavbarProps = {}) {
  const { t } = useTranslation('landing');
  const isOnMobileApp = useLocation().pathname === Routes.mobileApp;
  const bookingUrl = useCalBookingUrl();
  const [user, setUser] = useState<UserData | null>(null);
  const [, setIsLoadingUser] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSectionId | null>(
    trackActiveSection ? "features" : null,
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    async function checkAuth() {
      if (typeof window === 'undefined') return;

      try {
        const storedUserData = localStorage.getItem('luhive_user_data');
        if (storedUserData) {
          try {
            const parsed = JSON.parse(storedUserData);
            setUser(parsed);
            setIsLoadingUser(false);
          } catch {
            localStorage.removeItem('luhive_user_data');
          }
        }

        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            const userData: UserData = {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            };
            setUser(userData);
            localStorage.setItem('luhive_user_data', JSON.stringify(userData));
          } else {
            setUser(null);
            localStorage.removeItem('luhive_user_data');
          }
        } else {
          setUser(null);
          localStorage.removeItem('luhive_user_data');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setUser(null);
        localStorage.removeItem('luhive_user_data');
      } finally {
        setIsLoadingUser(false);
      }
    }

    checkAuth();
  }, []);

  const navItems: Array<{
    id: NavSectionId;
    href: string;
    labelKey: string;
  }> = [
    { id: "features", href: `${sectionBase}#features`, labelKey: "navV2.features" },
    { id: "pricing", href: `${sectionBase}#pricing`, labelKey: "navV2.pricing" },
    { id: "faqs", href: `${sectionBase}#faqs`, labelKey: "navV2.faqs" },
  ];

  useEffect(() => {
    if (!trackActiveSection) return;
    const sectionIds = navItems.map((item) => item.id);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (
          visibleEntry?.target.id &&
          sectionIds.includes(visibleEntry.target.id as NavSectionId)
        ) {
          setActiveSection(visibleEntry.target.id as NavSectionId);
        }
      },
      {
        threshold: 0.3,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [trackActiveSection]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={isMobileMenuOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-40 bg-black/10 transition-opacity duration-300 ease-out md:hidden",
          isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobileMenu}
      />

      <nav className="fixed inset-x-0 top-2 z-50 px-4 md:top-6 md:left-1/2 md:right-auto md:w-[600px] md:-translate-x-1/2 md:px-0">
        <div
          className={cn(
            "landing-mobile-nav md:hidden rounded-[28px] border",
            isMobileMenuOpen
              ? null
              : cn(
                  "bg-[#F6F4F1]/60 backdrop-blur-md backdrop-saturate-150",
                  scrolled ? "border-foreground/6 shadow-sm shadow-accent/10" : "border-foreground/10",
                ),
          )}
          data-open={isMobileMenuOpen || undefined}
        >
          <div className="flex h-14 items-center justify-between px-[18px]">
            <Link
              to={Routes.landing}
              aria-label="Luhive home"
              className="flex shrink-0 select-none rounded-full"
              onClick={closeMobileMenu}
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

            <div className="flex min-w-0 items-center gap-0.5">
              {user ? (
                <Link
                  to={Routes.profile}
                  prefetch="intent"
                  aria-label={t("navV2.yourProfile")}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-sm font-medium text-foreground outline-none hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-foreground/20 active:scale-[0.97]"
                >
                  <Avatar className="size-6 shrink-0">
                    {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                    <AvatarFallback className="bg-[#efeae4] text-[9px] font-medium text-foreground">
                      {user.full_name?.slice(0, 1).toUpperCase() || "•"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user.full_name || t("navV2.profile")}</span>
                </Link>
              ) : (
                <Link
                  to={Routes.login}
                  prefetch="intent"
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium text-foreground/80 outline-none hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-foreground/20 active:scale-[0.97]"
                >
                  {t("navV2.signIn")}
                </Link>
              )}
              <button
                type="button"
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground/80 outline-none hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-foreground/20 active:scale-[0.97]"
              >
                {isMobileMenuOpen ? (
                  <X className="size-5" strokeWidth={1.75} />
                ) : (
                  <Menu className="size-5" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          <div
            className="landing-mobile-nav-panel"
            data-open={isMobileMenuOpen}
            inert={isMobileMenuOpen ? undefined : true}
            aria-hidden={!isMobileMenuOpen}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="max-h-[calc(100svh-5.5rem)] overflow-y-auto px-[18px] pb-[18px] pt-1">
                <div className="flex flex-col gap-3.5">
                  {navItems.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className={cn(
                          "text-[1.35rem] font-medium leading-none tracking-tight transition-colors",
                          isActive ? "text-foreground" : "text-foreground/45 hover:text-foreground/70",
                        )}
                      >
                        {t(item.labelKey)}
                      </a>
                    );
                  })}
                  <Link
                    to={isOnMobileApp ? Routes.mobileApp : `${Routes.mobileApp}?utm_source=landing&utm_content=nav`}
                    onClick={closeMobileMenu}
                    className={cn(
                      "inline-flex items-center gap-2 text-[1.35rem] font-medium leading-none tracking-tight transition-colors",
                      isOnMobileApp ? "text-foreground" : "text-foreground/45 hover:text-foreground/70",
                    )}
                  >
                    <HugeiconsIcon icon={AppleIcon} size={18} color="currentColor" strokeWidth={1.75} aria-hidden />
                    {t("navV2.app")}
                  </Link>
                </div>

                <div className="my-4 h-px bg-foreground/10" />

                {user ? (
                  <Link
                    to={Routes.profile}
                    prefetch="intent"
                    onClick={closeMobileMenu}
                    className="block text-[1.35rem] font-medium leading-none tracking-tight text-foreground/55 transition-colors hover:text-foreground/80"
                  >
                    {t("navV2.yourProfile")}
                  </Link>
                ) : (
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      LandingAnalytics.trackBookDemoClicked("mobile_menu");
                      closeMobileMenu();
                    }}
                    className="block text-[1.35rem] font-medium leading-none tracking-tight text-foreground/55 transition-colors hover:text-foreground/80"
                  >
                    Book a Call
                  </a>
                )}

                <div className="mt-5 flex items-center gap-3">
                  {SOCIAL_LINKS.map((social) => (
                    <a
                      key={social.id}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="opacity-70 transition-opacity hover:opacity-100"
                    >
                      <img src={social.icon} alt="" className="size-8" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "hidden md:flex md:flex-col md:items-end md:min-h-14 md:justify-center md:rounded-full md:border",
            "bg-[#F6F4F1]/60 backdrop-blur-md backdrop-saturate-150 transition-all duration-300",
            scrolled ? "border-foreground/6 shadow-sm shadow-accent/10" : "border-foreground/10",
          )}
        >
          <div className="flex w-full items-center justify-between gap-px px-3 py-2">
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

            <div className="flex items-center gap-0.5 text-sm font-medium tracking-wide text-muted-foreground">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className={cn("px-3 transition-colors hover:text-foreground", isActive && "text-primary")}
                  >
                    {t(item.labelKey)}
                  </a>
                );
              })}
              <Link
                to={isOnMobileApp ? Routes.mobileApp : `${Routes.mobileApp}?utm_source=landing&utm_content=nav`}
                className={cn(
                  "inline-flex items-center gap-1 px-3 transition-colors hover:text-foreground",
                  isOnMobileApp && "text-primary",
                )}
              >
                <HugeiconsIcon icon={AppleIcon} size={15} color="currentColor" strokeWidth={1.75} aria-hidden />
                {t("navV2.app")}
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {user ? (
                <LandingAccountLink fullName={user.full_name} avatarUrl={user.avatar_url} scrolled={scrolled} />
              ) : (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => LandingAnalytics.trackBookDemoClicked("header")}
                  className={cn(
                    "ml-1 inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-foreground/6 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5",
                    scrolled &&
                      "border-primary bg-primary text-white shadow-sm transition-all duration-300 ease-out hover:border-primary/90 hover:bg-primary/90 hover:text-white",
                  )}
                >
                  <Avatar className={cn("size-5 shrink-0", scrolled && "ring-2 ring-white/90")}>
                    <AvatarImage src="/landing/ali-founder.png" alt="" />
                    <AvatarFallback className="text-[9px] font-medium">A</AvatarFallback>
                  </Avatar>
                  Book a Call
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}


