import { FAQ, FEATURES } from "~/modules/mobile-app/model/mobile-app-content";
import notificationsIcon from "~/assets/images/mobile-app/feature-notifications.webp";
import ticketsIcon from "~/assets/images/mobile-app/feature-tickets.webp";
import discoverIcon from "~/assets/images/mobile-app/feature-discover.webp";

// 3D icons leading each feature title (192 px sources, shown at 48 px for crisp 2-4x screens).
const FEATURE_ICONS = {
  notifications: notificationsIcon,
  tickets: ticketsIcon,
  discover: discoverIcon,
} as const;

/**
 * The indexable part of /app below the hero: what the app will do and the FAQ.
 * Styled one to one on the landing page's LandingFeatures (left-border items) and
 * LandingFAQ (divided list, +/−), as plain semantic HTML rendered on the server from the
 * same content the JSON-LD is built from.
 */
export function MobileAppDetails() {
  return (
    <>
      <section aria-labelledby="app-features" className="bg-[#F6F4F1] py-16 md:py-24">
        <div className="mx-auto w-[90vw] max-w-[70rem]">
          <h2
            id="app-features"
            className="mb-12 text-center text-3xl font-medium leading-tight tracking-tight text-[#141414] md:mb-20 md:text-[3rem]"
          >
            What's coming in the Luhive app
          </h2>

          <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
            {FEATURES.map((feature) => (
              <li
                key={feature.key}
                className="flex flex-col gap-3 border-l-[1.5px] border-solid border-[#DFDDCE] pl-5"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={FEATURE_ICONS[feature.key]}
                    alt=""
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    className="size-12 shrink-0"
                  />
                  <h3 className="text-xl font-medium leading-[1.2] text-[#141414]">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-md leading-[1.44] text-[#666661]">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="app-faq" className="bg-[#F6F4F1] py-16 md:py-24">
        <div className="mx-auto w-[90vw] 2xl:w-[90rem]">
          <h2
            id="app-faq"
            className="mb-12 text-center text-3xl font-medium leading-tight tracking-tight text-[#141414] md:mb-20 md:text-[3rem]"
          >
            Got questions?
          </h2>

          <div className="mx-auto w-full divide-y divide-[#f3ecde] md:w-[60%]">
            {FAQ.map((item, index) => (
              // <details> keeps every answer in the HTML, so crawlers read it while it is closed.
              <details
                key={item.question}
                open={index === 0}
                className="app-faq-item group rounded-lg px-0 py-5 transition-colors hover:bg-muted/30 sm:px-7 sm:py-6 md:px-5"
              >
                <summary className="flex cursor-pointer list-none items-start gap-4 text-left text-lg text-foreground [&::-webkit-details-marker]:hidden">
                  <h3 className="min-w-0 flex-1 font-medium">{item.question}</h3>
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center text-3xl leading-none text-muted-foreground"
                  >
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <p className="mt-2 pr-11 text-sm leading-relaxed text-muted-foreground md:text-md">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
