import { useState, useEffect, useId, useRef } from 'react';
import { useIsMobile } from '~/shared/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/shared/components/ui/dialog';
import { FullscreenModal } from '~/shared/components/ui/fullscreen-modal';
import { Button } from '~/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '~/shared/components/ui/avatar';
import { Separator } from '~/shared/components/ui/separator';
import { Spinner } from '~/shared/components/ui/spinner';
import { User, Mail, Pencil } from 'lucide-react';
import {
  PROFILE_NAME_MAX,
  PROFILE_NAME_MIN,
  normalizeProfileName,
} from '~/modules/profile/model/profile-name';
import type {
  CustomQuestionJson,
  CustomAnswerJson,
  DropdownOption,
} from '~/modules/events/model/event.types';
import {
  buildCustomAnswersFromFormState,
  isValidPhoneNumber,
  normalizePhoneInput,
  validateCustomAnswers,
} from '~/modules/events/utils/custom-questions';
import { Form } from 'react-router';
import {
  CustomQuestionFields,
  type CustomQuestionFormAnswers,
} from '~/modules/events/components/registration/custom-question-fields';

interface CustomQuestionsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  customQuestions: CustomQuestionJson | null;
  /** When true, renders only the form content without Dialog/Drawer wrapper (for embedding in another modal) */
  inline?: boolean;
  variant?: 'default' | 'overlay';
  /** Rendered after the last question, before the submit button (e.g. Join Community checkbox) */
  afterQuestionsContent?: React.ReactNode;
  // For authenticated users
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string | null;
  userPhone?: string | null; // From profiles.metadata.phone
  // For anonymous users (after name/email collection)
  anonymousName?: string;
  anonymousEmail?: string;
  /** Signed-in user can correct their name here; the new name is passed to onSubmit. */
  nameEditable?: boolean;
  onSubmit: (answers: CustomAnswerJson, fullName?: string) => void;
  isSubmitting?: boolean;
}

export function CustomQuestionsForm({
  open,
  onOpenChange,
  eventId,
  customQuestions,
  userName,
  userEmail,
  userAvatarUrl,
  userPhone,
  anonymousName,
  anonymousEmail,
  nameEditable = false,
  onSubmit,
  isSubmitting = false,
  inline = false,
  variant = 'default',
  afterQuestionsContent,
}: CustomQuestionsFormProps) {
  const formId = useId();
  const isMobile = useIsMobile();
  const isOverlay = variant === 'overlay';
  const useInlineLayout = inline || isOverlay;
  const isAuthenticated = Boolean(userEmail || userName);
  const authenticatedFallbackName = userEmail?.split('@')[0]?.trim() || 'User';

  const [phone, setPhone] = useState('');
  const [customAnswers, setCustomAnswers] = useState<CustomQuestionFormAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // null = showing the name as text; a string = the name is being edited.
  const [editedName, setEditedName] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editedName !== null) nameInputRef.current?.select();
    // Only when editing starts, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedName !== null]);

  useEffect(() => {
    if (isAuthenticated && userPhone && !phone) {
      setPhone(userPhone);
    }
  }, [isAuthenticated, userPhone, phone]);

  useEffect(() => {
    if (!open) {
      setPhone('');
      setCustomAnswers({});
      setErrors({});
    }
  }, [open]);

  const handlePhoneChange = (value: string) => {
    setPhone(normalizePhoneInput(value));

    if (errors.phone) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };

  const handlePhoneBlur = () => {
    if (phone && !isValidPhoneNumber(phone)) {
      setErrors((prev) => ({
        ...prev,
        phone: 'Please enter a valid phone number in international format (e.g., +994501234567)',
      }));
    }
  };

  const handleCustomAnswerChange = (
    questionId: string,
    value: string | DropdownOption | DropdownOption[]
  ) => {
    setCustomAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const handleMultiCheckboxChange = (
    questionId: string,
    option: DropdownOption,
    checked: boolean
  ) => {
    const current = customAnswers[questionId];
    const currentArray = Array.isArray(current) ? current : [];
    const updated = checked
      ? [...currentArray, option]
      : currentArray.filter((v) => v.id !== option.id);
    handleCustomAnswerChange(questionId, updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let fullName: string | undefined;
    if (nameEditable && editedName !== null) {
      fullName = normalizeProfileName(editedName);
      if (fullName.length < PROFILE_NAME_MIN) {
        setErrors((prev) => ({
          ...prev,
          fullName: `Name must be at least ${PROFILE_NAME_MIN} characters`,
        }));
        nameInputRef.current?.focus();
        return;
      }
    }

    const answers = buildCustomAnswersFromFormState(
      customQuestions,
      phone,
      customAnswers,
    );

    if (!customQuestions) {
      onSubmit(answers, fullName);
      return;
    }

    const validation = validateCustomAnswers(answers, customQuestions);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSubmit(answers, fullName);
  };

  const displayName = isAuthenticated
    ? (userName?.trim() || authenticatedFallbackName)
    : anonymousName;
  const displayEmail = isAuthenticated ? userEmail : anonymousEmail;
  const displayAvatar = isAuthenticated ? userAvatarUrl : null;

  const hasQuestions = customQuestions && (
    customQuestions.phone.enabled ||
    (customQuestions.custom && customQuestions.custom.length > 0)
  );

  const formBody = (
    <div className={isOverlay ? 'space-y-6' : 'space-y-6'}>
      <div className={isOverlay ? undefined : 'space-y-4'}>
        <div
          className={
            isOverlay
              ? 'flex items-center gap-3'
              : 'flex items-center gap-4 p-4 bg-muted/50 rounded-lg'
          }
        >
          {displayAvatar ? (
            <Avatar className={isOverlay ? 'h-10 w-10' : 'h-12 w-12'}>
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {displayName?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div
              className={
                isOverlay
                  ? 'h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'
                  : 'h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center'
              }
            >
              <User className={isOverlay ? 'h-5 w-5 text-primary' : 'h-6 w-6 text-primary'} />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-0.5">
            {nameEditable && editedName !== null ? (
              <input
                ref={nameInputRef}
                value={editedName}
                onChange={(e) => {
                  setEditedName(e.target.value);
                  if (errors.fullName) {
                    setErrors(({ fullName: _removed, ...rest }) => rest);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setEditedName(null);
                    setErrors(({ fullName: _removed, ...rest }) => rest);
                  }
                }}
                maxLength={PROFILE_NAME_MAX}
                autoComplete="name"
                aria-label="Your full name"
                aria-invalid={!!errors.fullName || undefined}
                placeholder="Your full name"
                disabled={isSubmitting}
                className="-mx-2 h-8 w-[calc(100%+1rem)] rounded-md border border-input bg-background px-2 font-semibold outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
              />
            ) : nameEditable ? (
              <button
                type="button"
                onClick={() => setEditedName(userName?.trim() || '')}
                aria-label="Edit your name"
                title="Edit your name"
                className="group/name -mx-1 flex max-w-full items-center gap-1.5 rounded-md px-1 text-left transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted"
              >
                <span className="truncate font-semibold">{displayName}</span>
                <Pencil className="size-3.5 shrink-0 text-muted-foreground transition-colors [@media(hover:hover)_and_(pointer:fine)]:group-hover/name:text-foreground" />
              </button>
            ) : (
              <span className="font-semibold">{displayName}</span>
            )}
            {isOverlay ? (
              <p className="text-sm text-muted-foreground truncate">{displayEmail}</p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>{displayEmail}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {errors.fullName && (
        <p className="-mt-4 text-xs text-destructive">{errors.fullName}</p>
      )}

      {hasQuestions && (
        <>
          {!isOverlay && <Separator />}

          <CustomQuestionFields
            customQuestions={customQuestions}
            phone={phone}
            customAnswers={customAnswers}
            errors={errors}
            onPhoneChange={handlePhoneChange}
            onPhoneBlur={handlePhoneBlur}
            onAnswerChange={handleCustomAnswerChange}
            onMultiCheckboxChange={handleMultiCheckboxChange}
            isOverlay={isOverlay}
            isSubmitting={isSubmitting}
          />
        </>
      )}
    </div>
  );

  const submitButton = (
    <Button
      type="submit"
      form={formId}
      className="w-full"
      size="lg"
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <>
          <Spinner className="h-4 w-4 mr-2" />
          Submitting...
        </>
      ) : isOverlay ? (
        "Register"
      ) : (
        "Complete Registration"
      )}
    </Button>
  );

  if (useInlineLayout) {
    return (
      <Form
        id={formId}
        onSubmit={handleSubmit}
        className={isOverlay ? 'flex flex-col gap-8' : 'contents'}
      >
        <div
          className={
            isOverlay
              ? 'space-y-6'
              : 'flex-1 min-h-0 overflow-y-auto px-4 space-y-2 pb-4'
          }
        >
          {formBody}
          {afterQuestionsContent}
        </div>
        <div className={isOverlay ? undefined : 'px-4 py-4 shrink-0'}>
          {submitButton}
        </div>
      </Form>
    );
  }

  if (isMobile) {
    return (
      <FullscreenModal
        open={open}
        onOpenChange={onOpenChange}
        title="Complete Your Registration"
        footer={submitButton}
      >
        <Form
          id={formId}
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0"
        >
          {formBody}
          {afterQuestionsContent}
        </Form>
      </FullscreenModal>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 pr-10 shrink-0">
          <DialogTitle>Complete Your Registration</DialogTitle>
          <DialogDescription>
            {hasQuestions
              ? "Please answer the following questions to complete your registration."
              : "Review your information and complete your registration."}
          </DialogDescription>
        </DialogHeader>
        <Form
          id={formId}
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 space-y-4">
            {formBody}
            {afterQuestionsContent}
          </div>
          <div className="px-6 py-4 shrink-0">{submitButton}</div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
