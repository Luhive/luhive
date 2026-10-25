export { loader } from "~/modules/mobile-app/server/mobile-app-loader.server";
export { action } from "~/modules/mobile-app/server/mobile-app-action.server";
export { meta } from "~/modules/mobile-app/model/mobile-app-meta";

import { Link, useActionData, useLoaderData } from "react-router";
import { CheckCircle2, Smartphone } from "lucide-react";
import { Routes } from "~/shared/lib/routing/routes";
import { MobileAppWaitlistForm } from "~/modules/mobile-app/components/mobile-app-waitlist-form";
import type { MobileAppLoaderData } from "~/modules/mobile-app/server/mobile-app-loader.server";
import type { MobileAppActionData } from "~/modules/mobile-app/server/mobile-app-action.server";

// Reached only from a LinkedIn post comment; deliberately not linked from navigation.
export default function MobileAppPage() {
  const { user, alreadyJoined, utm } = useLoaderData<MobileAppLoaderData>();
  const actionData = useActionData<MobileAppActionData>();
  const joined = alreadyJoined || actionData?.success === true;

  return (
    <div className="min-h-screen bg-secondary">
      <nav className="flex h-14 items-center px-5">
        <Link to={Routes.landing} className="text-lg font-semibold text-primary">
          Luhive
        </Link>
      </nav>

      <main className="mx-auto max-w-[520px] px-5 pb-16 pt-8 md:pt-16">
        <div className="mb-8 space-y-4">
          <div className="inline-flex rounded-full bg-primary/10 p-3">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Luhive mobil tətbiqi yolda
          </h1>
          <p className="text-base text-muted-foreground md:text-lg">
            Tədbirlər, biletlər və icmalarınız bir yerdə, telefonunuzda. Hazır
            olanda ilk xəbər tutanlardan olun.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
          {joined ? (
            <div className="space-y-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h2 className="text-xl font-semibold">Siyahıdasınız</h2>
              <p className="text-sm text-muted-foreground">
                Tətbiq hazır olanda sizə ilk xəbər verəcəyik.
              </p>
            </div>
          ) : (
            <MobileAppWaitlistForm user={user} utm={utm} error={actionData?.error} />
          )}
        </div>
      </main>
    </div>
  );
}
