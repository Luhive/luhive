import { Bell, Compass, Plus, Ticket } from "lucide-react";
import { FAQ, FEATURES } from "~/modules/mobile-app/model/mobile-app-content";

const FEATURE_ICONS = {
  notifications: Bell,
  tickets: Ticket,
  discover: Compass,
} as const;

/**
 * The indexable part of /app below the hero: what the app will do and the FAQ. Plain
 * semantic HTML (section, h2, h3, details) rendered on the server, from the same content
 * the JSON-LD is built from.
 */
export function MobileAppDetails() {
  return (
    <div className="bg-[#F6F4F1] pb-20 md:pb-28">
      <section aria-labelledby="app-features" className="mx-auto w-[95vw] max-w-5xl">
        <h2
          id="app-features"
          className="mb-3 text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
        >
          What's coming in the Luhive app
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground md:text-base">
          Luhive helps communities run events and stay close to their members. The mobile app
          brings that to your phone, on iPhone and Android. We are deciding what ships first,
          so tell us after you join.
        </p>
        <ul className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = FEATURE_ICONS[feature.key];
            return (
              <li
                key={feature.key}
                className="rounded-2xl border border-foreground/[0.06] bg-white/70 p-6 text-left"
              >
                <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mb-2 text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="app-faq" className="mx-auto mt-20 w-[95vw] max-w-2xl md:mt-28">
        <h2
          id="app-faq"
          className="mb-8 text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
        >
          Questions
        </h2>
        <div className="divide-y divide-foreground/[0.08] border-y border-foreground/[0.08]">
          {FAQ.map((item) => (
            // <details> keeps every answer in the HTML, so crawlers read it while it is closed.
            <details key={item.question} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <h3 className="text-base font-medium">{item.question}</h3>
                <Plus
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45"
                />
              </summary>
              <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground md:text-base">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
