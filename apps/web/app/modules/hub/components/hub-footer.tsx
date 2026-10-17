import { Link } from "react-router";
import { Instagram, Linkedin, Mail } from "lucide-react";
import { useCalBookingUrl } from "~/shared/hooks/use-cal-booking-url";
import { Routes } from "~/shared/lib/routing/routes";
import { safeAreaGutterClassName } from "~/modules/hub/components/hub-grid-layout";
import luhiveMark from "~/assets/images/hub/luhive-mark.svg";

const SOCIAL_LINKS = [
  { href: "https://www.instagram.com/luhivecom/", label: "Luhive on Instagram", Icon: Instagram },
  { href: "https://www.linkedin.com/company/luhive", label: "Luhive on LinkedIn", Icon: Linkedin },
  { href: "mailto:team@luhive.com", label: "Email Luhive", Icon: Mail },
] as const;

const linkClassName =
  "rounded-md text-[#8c8e9a] transition-colors duration-150 ease-standard hover:text-[#111] outline-none focus-visible:ring-2 focus-visible:ring-[#111]/15";

type HubFooterProps = {
  /** Width and gutters, so the footer lines up with the page content above. */
  widthClassName?: string;
};

export function HubFooter({
  widthClassName = `max-w-[1040px] ${safeAreaGutterClassName}`,
}: HubFooterProps) {
  const bookingUrl = useCalBookingUrl();

  return (
    <footer className={`hub-touch-surface mx-auto w-full font-inter antialiased ${widthClassName}`}>
      <div className="flex flex-col-reverse items-center gap-x-6 gap-y-3 border-t border-[#ededed] pb-8 pt-5 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[14px] leading-none">
          <Link
            to={Routes.home}
            aria-label="Luhive home"
            className="rounded-md opacity-80 transition-opacity duration-150 ease-standard hover:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-[#111]/15"
          >
            <span className="relative block size-4">
              <img
                src={luhiveMark}
                alt=""
                width={20.1412}
                height={20.1412}
                className="absolute left-0 top-0 block max-w-none origin-top-left scale-[0.8]"
              />
            </span>
          </Link>
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className={linkClassName}>
            Meet with founder
          </a>
          <Link to={`${Routes.home}#pricing`} className={linkClassName}>
            Pricing
          </Link>
          <a href="#" className={linkClassName}>
            Help
          </a>
        </div>

        <div className="flex items-center sm:-mr-2">
          {SOCIAL_LINKS.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              aria-label={label}
              {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={`flex size-8 items-center justify-center ${linkClassName}`}
            >
              <Icon className="size-4" strokeWidth={1.75} aria-hidden />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
