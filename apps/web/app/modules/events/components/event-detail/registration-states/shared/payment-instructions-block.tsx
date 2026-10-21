export function PaymentInstructionsBlock({
  instructions,
}: {
  instructions: string | null;
}) {
  return (
    <div className="space-y-1 rounded-lg border bg-muted/50 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">How to pay</p>
      <p className="whitespace-pre-line break-words text-sm">
        {instructions ?? "The organiser will send you the payment details."}
      </p>
    </div>
  );
}
