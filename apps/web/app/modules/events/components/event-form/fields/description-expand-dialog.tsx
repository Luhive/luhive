import { useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Maximize2, XIcon } from 'lucide-react';

import { Button } from '~/shared/components/ui/button';
import { Textarea } from '~/shared/components/ui/textarea';
import { cn } from '~/shared/lib/utils/cn';

interface DescriptionExpandDialogProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
}

// Opens the description in a roomy modal. Edits the same state as the inline field,
// so nothing needs to be saved or synced on close.
export function DescriptionExpandDialog({
  value,
  onChange,
  maxLength,
  placeholder,
}: DescriptionExpandDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Expand description editor"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
        >
          <Maximize2 className="size-3.5" />
          Expand
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="expand-editor-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => {
            // Focus the editor with the caret at the end, where the user left off.
            e.preventDefault();
            const el = textareaRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
            el.scrollTop = el.scrollHeight;
          }}
          className={cn(
            'expand-editor-content fixed top-1/2 left-1/2 z-50 flex h-[min(80vh,720px)] w-[min(48rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border bg-background p-6 shadow-2xl outline-none'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-base font-semibold">
                Description
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                Tell attendees what this event is about.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-md p-1 text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
            >
              <XIcon className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="min-h-0 flex-1 resize-none overflow-y-auto leading-relaxed field-sizing-fixed md:text-[15px]"
          />

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground tabular-nums">
              {value.length}/{maxLength} characters
            </p>
            <DialogPrimitive.Close asChild>
              <Button type="button" size="sm" className="active:scale-[0.97] transition-transform">
                Done
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
