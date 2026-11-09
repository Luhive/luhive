import { useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import {
  PROFILE_NAME_MAX,
  PROFILE_NAME_MIN,
  normalizeProfileName,
} from '~/modules/profile/model/profile-name';

interface EditableNameProps {
  /** Name shown when not editing. */
  displayName: string;
  /** The stored profile name to start editing from (empty when the display name is a fallback). */
  initialName?: string;
  /** null = showing the name; a string = the name being edited. Owned by the form so it can submit it. */
  editedName: string | null;
  onEditedNameChange: (value: string | null) => void;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * The attendee's name in a registration form header, editable in place.
 * The form submits the edited name with the registration.
 */
export function EditableName({
  displayName,
  initialName,
  editedName,
  onEditedNameChange,
  invalid,
  disabled,
}: EditableNameProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editedName !== null;

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editedName}
        onChange={(e) => onEditedNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onEditedNameChange(null);
          }
        }}
        maxLength={PROFILE_NAME_MAX}
        autoComplete="name"
        aria-label="Your full name"
        aria-invalid={invalid || undefined}
        placeholder="Your full name"
        disabled={disabled}
        className="-mx-2 h-8 w-[calc(100%+1rem)] rounded-md border border-input bg-background px-2 font-semibold outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => onEditedNameChange(initialName?.trim() || '')}
      disabled={disabled}
      aria-label="Edit your name"
      title="Edit your name"
      className="group/name -mx-1 flex max-w-full items-center gap-1.5 rounded-md px-1 text-left transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted"
    >
      <span className="truncate font-semibold">{displayName}</span>
      <Pencil className="size-3.5 shrink-0 text-muted-foreground transition-colors [@media(hover:hover)_and_(pointer:fine)]:group-hover/name:text-foreground" />
    </button>
  );
}

/** Checks an edited name before submit: `fullName` to send, or `error` to show. Not editing → neither. */
export function checkEditedName(editedName: string | null): { fullName?: string; error?: string } {
  if (editedName === null) return {};
  const fullName = normalizeProfileName(editedName);
  if (fullName.length < PROFILE_NAME_MIN) {
    return { error: `Name must be at least ${PROFILE_NAME_MIN} characters` };
  }
  return { fullName };
}
