import { Label } from '~/shared/components/ui/label';
import { Textarea } from '~/shared/components/ui/textarea';

interface EventPaymentInstructionsProps {
  value: string;
  onChange: (value: string) => void;
}

export function EventPaymentInstructions({ value, onChange }: EventPaymentInstructionsProps) {
  const isMissing = !value.trim();

  return (
    <div className="space-y-2">
      <Label htmlFor="payment-instructions">Payment Instructions</Label>
      <Textarea
        id="payment-instructions"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Card number: 4169 0000 0000 0000\nName on card: Ali Aliyev\nAdd your full name to the transfer note.'}
        rows={4}
        aria-invalid={isMissing}
      />
      <p className="text-xs text-muted-foreground">
        Shown only to people who registered. You collect the money yourself. Luhive does not process it, and marking someone paid is your confirmation, not a tax receipt.
      </p>
    </div>
  );
}
