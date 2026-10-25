import { Form, useNavigation } from "react-router";
import { ArrowRight } from "lucide-react";
import { Spinner } from "~/shared/components/ui/spinner";
import type { UTMAttribution } from "~/modules/events/utils/utm-source";
import {
  FIRST_FEATURE_OPTIONS,
  PLATFORM_OPTIONS,
} from "~/modules/mobile-app/model/mobile-app-waitlist";

type MobileAppWaitlistFormProps = {
  user: { email: string | null } | null;
  utm: UTMAttribution;
  error?: string;
};

type Option = { value: string; label: string };

// Chips use the landing hero's secondary pill (DiscoverCommunitiesLink).
function ChoiceGroup({
  name,
  legend,
  options,
}: {
  name: string;
  legend: string;
  options: readonly Option[];
}) {
  return (
    <fieldset className="flex flex-col items-center gap-3">
      <legend className="mb-3 w-full text-center text-sm font-medium text-foreground/70">
        {legend}
      </legend>
      <div className="flex flex-wrap justify-center gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              className="peer sr-only"
            />
            <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/[0.06] px-4 py-2 text-sm font-medium text-foreground/70 transition-[color,background-color,border-color,transform] duration-150 ease-out hover:border-primary/30 hover:bg-primary/10 hover:text-foreground active:scale-[0.97] peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary/30">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MobileAppWaitlistForm({ user, utm, error }: MobileAppWaitlistFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Form method="post" className="mx-auto flex max-w-xl flex-col items-center gap-8">
      <ChoiceGroup
        name="firstFeature"
        legend="İlk versiyada nə olsun?"
        options={FIRST_FEATURE_OPTIONS}
      />
      <ChoiceGroup
        name="platform"
        legend="Hansı telefondan istifadə edirsiniz?"
        options={PLATFORM_OPTIONS}
      />

      <input type="hidden" name="utm_source" value={utm.utmSource} />
      {utm.utmMedium && <input type="hidden" name="utm_medium" value={utm.utmMedium} />}
      {utm.utmCampaign && <input type="hidden" name="utm_campaign" value={utm.utmCampaign} />}
      {utm.utmContent && <input type="hidden" name="utm_content" value={utm.utmContent} />}
      {utm.utmTerm && <input type="hidden" name="utm_term" value={utm.utmTerm} />}

      <div className="flex w-full flex-col items-center gap-3">
        {!user && (
          <input
            name="email"
            type="email"
            aria-label="E-poçt"
            autoComplete="email"
            placeholder="E-poçt ünvanınız"
            required
            maxLength={320}
            className="h-12 w-full max-w-sm rounded-full border border-foreground/10 bg-white/70 px-5 text-center text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-primary/20 md:text-sm"
          />
        )}

        {/* Same pill as the landing hero's Book a Call button. */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex items-center gap-3 rounded-full bg-[#FF6D23] py-3 pl-7 pr-3 text-base text-white shadow-[0px_2px_8px_rgba(255,109,35,0.4),0px_1px_2px_rgba(0,0,0,0.06)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#E55A1A] hover:shadow-[0px_6px_18px_rgba(255,109,35,0.5)] active:scale-95 disabled:opacity-70"
        >
          Məni də xəbərdar et
          <span className="flex size-7 items-center justify-center rounded-full bg-white/20">
            {isSubmitting ? (
              <Spinner className="size-3.5" />
            ) : (
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            )}
          </span>
        </button>

        {user?.email && (
          <p className="text-xs text-muted-foreground">
            Xəbəri {user.email} ünvanına göndərəcəyik.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Form>
  );
}
