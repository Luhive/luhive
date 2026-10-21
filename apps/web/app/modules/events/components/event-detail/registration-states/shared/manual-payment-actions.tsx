import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Receipt } from "lucide-react";
import { Button } from "~/shared/components/ui/button";
import { useInvalidateEventRegistrationQuery } from "~/modules/events/hooks/use-event-registration-query";

type PaymentActionData = { success: boolean; error?: string; message?: string };

export function ManualPaymentActions({
  registrationId,
  eventId,
  hasReceipt,
}: {
  registrationId: string;
  eventId: string;
  hasReceipt: boolean;
}) {
  const fetcher = useFetcher<PaymentActionData>();
  const invalidate = useInvalidateEventRegistrationQuery(eventId);
  const [confirmCash, setConfirmCash] = useState(false);
  const isBusy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      invalidate();
    }
  }, [fetcher.state, fetcher.data, invalidate]);

  function uploadReceipt(file: File) {
    const body = new FormData();
    body.set("intent", "upload-receipt");
    body.set("registrationId", registrationId);
    body.set("receipt", file);
    fetcher.submit(body, {
      method: "post",
      action: "/api/events/ticket-payment",
      encType: "multipart/form-data",
    });
  }

  function chooseCash() {
    const body = new FormData();
    body.set("intent", "pay-at-door");
    body.set("registrationId", registrationId);
    fetcher.submit(body, { method: "post", action: "/api/events/ticket-payment" });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {hasReceipt ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Receipt className="h-3.5 w-3.5 shrink-0" />
          Receipt sent. The organiser will confirm your spot soon.
        </p>
      ) : null}

      <Button asChild size="sm" className="w-full" disabled={isBusy}>
        <label className={isBusy ? "pointer-events-none opacity-70" : "cursor-pointer"}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="sr-only"
            disabled={isBusy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) uploadReceipt(file);
            }}
          />
          <Receipt className="h-4 w-4" />
          {isBusy ? "Sending…" : hasReceipt ? "Replace receipt" : "Upload receipt"}
        </label>
      </Button>

      {!hasReceipt ? (
        confirmCash ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs text-foreground underline-offset-2 hover:underline disabled:opacity-50"
              disabled={isBusy}
              onClick={chooseCash}
            >
              Confirm cash at the door
            </button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              disabled={isBusy}
              onClick={() => setConfirmCash(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="self-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
            disabled={isBusy}
            onClick={() => setConfirmCash(true)}
          >
            Paying cash at the door instead?
          </button>
        )
      ) : null}

      {fetcher.data && !fetcher.data.success ? (
        <p className="text-xs text-destructive">{fetcher.data.error}</p>
      ) : null}
    </div>
  );
}
