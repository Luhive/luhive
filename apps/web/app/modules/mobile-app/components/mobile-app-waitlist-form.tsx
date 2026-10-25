import { Form, useNavigation } from "react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
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
    <fieldset className="space-y-2.5">
      <legend className="mb-2.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              className="peer sr-only"
            />
            <span className="inline-flex h-9 items-center rounded-full border border-border bg-background px-4 text-sm transition-colors hover:border-primary/40 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">
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
    <Form method="post" className="space-y-7">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

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

      {!user && (
        <div className="space-y-2">
          <Label htmlFor="email">E-poçt</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="siz@example.com"
            required
            maxLength={320}
          />
        </div>
      )}

      <input type="hidden" name="utm_source" value={utm.utmSource} />
      {utm.utmMedium && <input type="hidden" name="utm_medium" value={utm.utmMedium} />}
      {utm.utmCampaign && <input type="hidden" name="utm_campaign" value={utm.utmCampaign} />}
      {utm.utmContent && <input type="hidden" name="utm_content" value={utm.utmContent} />}
      {utm.utmTerm && <input type="hidden" name="utm_term" value={utm.utmTerm} />}

      <div className="space-y-2">
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Məni də xəbərdar et
        </Button>
        {user?.email && (
          <p className="text-center text-xs text-muted-foreground">
            Xəbəri {user.email} ünvanına göndərəcəyik.
          </p>
        )}
      </div>
    </Form>
  );
}
