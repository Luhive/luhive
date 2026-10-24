import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { X } from "lucide-react";

import { Button } from "~/shared/components/ui/button";
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
    id: 'x',
    icon: '/landing/xplatfrom.svg',
    href: 'https://twitter.com/luhive_',
    label: 'X (Twitter)',
  },
  {
    id: 'linkedin',
    icon: '/landing/Linkedin.svg',
    href: 'https://www.linkedin.com/company/luhive',
    label: 'LinkedIn',
  },
  {
    id: 'telegram',
    icon: '/landing/Telegram.svg',
    href: 'https://t.me/luhive',
    label: 'Telegram',
  },
  {
    id: 'instagram',
    icon: '/landing/Instagram.svg',
    href: 'https://instagram.com/luhive',
    label: 'Instagram',
  },
];

type NavSectionId = "features" | "pricing" | "faqs";

export function LandingNavbar() {
  const { t } = useTranslation('landing');
  const bookingUrl = useCalBookingUrl();
  const [user, setUser] = useState<UserData | null>(null);
  const [, setIsLoadingUser] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSectionId>("features");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Prevent body scroll when mobile menu is open
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
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
    { id: "features", href: "#features", labelKey: "navV2.features" },
    { id: "pricing", href: "#pricing", labelKey: "navV2.pricing" },
    { id: "faqs", href: "#faqs", labelKey: "navV2.faqs" },
  ];

  useEffect(() => {
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
  }, []);

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 flex flex-col items-end h-14 px-4
          md:h-auto md:min-h-14 md:my-2 md:rounded-full md:border md:top-6 md:justify-center md:left-1/2 md:right-auto md:w-[600px] md:-translate-x-1/2 md:px-0
          bg-[#F6F4F1]/60 backdrop-blur-md backdrop-saturate-150 transition-all duration-300
          ${scrolled ? "shadow-sm shadow-accent/10 md:border-foreground/6" : "md:border-foreground/10"}
        `}
      >
        <div className="flex justify-between items-center w-full h-full md:h-auto md:gap-px md:px-3 md:py-2">
          {/* Logo */}
          <Link
            to={Routes.landing}
            aria-label="Luhive home"
            className="flex shrink-0 select-none rounded-full px-2 py-1 hover:bg-black/[0.04] transition-colors"
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

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5 text-sm font-medium tracking-wide text-muted-foreground">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`px-3 transition-colors hover:text-foreground ${
                    isActive ? "text-primary" : ""
                  }`}
                >
                  {t(item.labelKey)}
                </a>
              );
            })}
          </nav>

          {/* CTA — Book a Call for visitors; signed-in users already have a community, so their profile instead */}
          <div className="flex items-center gap-1 shrink-0">
            {user ? (
              <LandingAccountLink fullName={user.full_name} avatarUrl={user.avatar_url} scrolled={scrolled} />
            ) : (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => LandingAnalytics.trackBookDemoClicked("header")}
                className={cn(
                  "inline-flex items-center gap-1.5 font-medium py-2 px-3 md:ml-1 rounded-full border border-foreground/6 hover:bg-foreground/5 transition-colors text-sm whitespace-nowrap select-none text-foreground",
                  scrolled &&
                    "border-primary bg-primary text-white shadow-sm transition-all duration-300 ease-out hover:border-primary/90 hover:bg-primary/90 hover:text-white",
                )}
              >
                <Avatar
                  className={cn(
                    "size-5 shrink-0",
                    scrolled && "ring-2 ring-white/90",
                  )}
                >
                  <AvatarImage src="/landing/ali-founder.png" alt="" />
                  <AvatarFallback className="text-[9px] font-medium">
                    A
                  </AvatarFallback>
                </Avatar>
                Book a Call
              </a>
            )}

            {/* Hamburger — disabled for now (Book a Call is enough on mobile)
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground md:hidden hover:bg-black/[0.06] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            */}
          </div>
        </div>
      </nav>

      {/* Mobile Menu overlay (outside the nav so it doesn't clip) */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-60 bg-black/50 transition-opacity duration-300 ease-out md:hidden ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 z-70 w-full bg-[#F6F4F1] h-[100svh] shadow-xl md:hidden transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex w-[80vw] mx-auto h-full flex-col bg-[#F6F4F1]">
          {/* Header with close button */}
          <div className="flex items-center justify-end p-4">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
            {navItems.map((item, index) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-2xl font-medium transition-all duration-300 ${
                    isMobileMenuOpen
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  } ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={{
                    transitionDelay: isMobileMenuOpen
                      ? `${100 + index * 50}ms`
                      : "0ms",
                  }}
                >
                  {t(item.labelKey)}
                </a>
              );
            })}
          </nav>

          {/* Bottom Section: CTA + Social */}
          <div
            className={`p-6 transition-all duration-300 ${
              isMobileMenuOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: isMobileMenuOpen ? "350ms" : "0ms" }}
          >
            <div className="mb-6 flex justify-start">
              <Button
                className="flex min-w-max items-center rounded-full bg-[#FF7A1A] px-6 py-6 text-base font-semibold text-white shadow-sm hover:bg-[#ff8e3a]"
                asChild
              >
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    LandingAnalytics.trackBookDemoClicked("mobile_menu");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Get Started
                </a>
              </Button>
            </div>

            {/* Social Icons */}
            <div className="flex w-full items-center justify-between gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-13 w-13 items-center justify-center rounded-xl bg-white transition-colors hover:bg-muted"
                  aria-label={social.label}
                >
                  <img
                    src={social.icon}
                    alt={social.label}
                    className="h-13 w-13 object-contain"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


