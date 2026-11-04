import { Phone } from "lucide-react";
import { SocialHandleField } from "~/modules/profile/components/social-handle-field";
import { ProfileLinks } from "~/modules/profile/model/profile-social-links";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { Textarea } from "~/shared/components/ui/textarea";
import { Checkbox } from "~/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/shared/components/ui/select";
import type {
  CustomQuestionJson,
  DropdownOption,
} from "~/modules/events/model/event.types";
import { formatPhoneNumber } from "~/modules/events/utils/custom-questions";
import { MAX_ANSWER_LENGTH } from "~/modules/events/utils/custom-questions-constants";
import { cn } from "~/shared/lib/utils/cn";

export const REGISTRATION_OVERLAY_FIELD_CLASS =
  "bg-muted/50 border-transparent shadow-none h-11 rounded-lg focus-visible:bg-background";

export type CustomQuestionFormAnswers = Record<
  string,
  string | DropdownOption | DropdownOption[]
>;

interface CustomQuestionFieldsProps {
  customQuestions: CustomQuestionJson | null;
  phone: string;
  customAnswers: CustomQuestionFormAnswers;
  errors: Record<string, string>;
  onPhoneChange: (value: string) => void;
  onPhoneBlur?: () => void;
  onAnswerChange: (
    questionId: string,
    value: string | DropdownOption | DropdownOption[],
  ) => void;
  onMultiCheckboxChange: (
    questionId: string,
    option: DropdownOption,
    checked: boolean,
  ) => void;
  isOverlay?: boolean;
  isSubmitting?: boolean;
  phoneInputId?: string;
}

export function CustomQuestionFields({
  customQuestions,
  phone,
  customAnswers,
  errors,
  onPhoneChange,
  onPhoneBlur,
  onAnswerChange,
  onMultiCheckboxChange,
  isOverlay = false,
  isSubmitting = false,
  phoneInputId = "phone",
}: CustomQuestionFieldsProps) {
  if (!customQuestions) {
    return null;
  }

  const hasQuestions =
    customQuestions.phone.enabled ||
    (customQuestions.custom && customQuestions.custom.length > 0);

  if (!hasQuestions) {
    return null;
  }

  return (
    <div className="space-y-5 pb-0">
      {customQuestions.phone.enabled && (
        <div className="space-y-2">
          <Label htmlFor={phoneInputId}>
            Phone Number
            {customQuestions.phone.required && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={phoneInputId}
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              onBlur={onPhoneBlur}
              placeholder="+994501234567"
              required={customQuestions.phone.required}
              disabled={isSubmitting}
              className={cn(
                errors.phone ? "border-destructive pl-10" : "pl-10",
                isOverlay && REGISTRATION_OVERLAY_FIELD_CLASS,
              )}
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone}</p>
          )}
          {phone && !errors.phone && (
            <p className="text-xs text-muted-foreground">
              {formatPhoneNumber(phone)}
            </p>
          )}
        </div>
      )}

      {customQuestions.custom &&
        customQuestions.custom.length > 0 &&
        customQuestions.custom
          .sort((a, b) => a.order - b.order)
          .map((question) => {
            const questionType = question.type ?? "text";

            if (questionType === "dropdown" && question.allowMultiple) {
              const selectedValues = Array.isArray(customAnswers[question.id])
                ? (customAnswers[question.id] as DropdownOption[])
                : [];

              return (
                <div key={question.id} className="space-y-2">
                  <Label>
                    {question.label}
                    {question.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <div className="space-y-2">
                    {(question.options ?? []).map((option) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`${question.id}-${option.id}`}
                          checked={selectedValues.some((v) => v.id === option.id)}
                          onCheckedChange={(checked) =>
                            onMultiCheckboxChange(
                              question.id,
                              option,
                              checked === true,
                            )
                          }
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor={`${question.id}-${option.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors[question.id] && (
                    <p className="text-xs text-destructive">{errors[question.id]}</p>
                  )}
                </div>
              );
            }

            if (questionType === "dropdown") {
              const selectedOption =
                customAnswers[question.id] &&
                typeof customAnswers[question.id] === "object" &&
                !Array.isArray(customAnswers[question.id])
                  ? (customAnswers[question.id] as DropdownOption)
                  : null;

              return (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={`question-${question.id}`}>
                    {question.label}
                    {question.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <Select
                    value={selectedOption?.id ?? ""}
                    onValueChange={(optionId) => {
                      const option = (question.options ?? []).find(
                        (o) => o.id === optionId,
                      );
                      if (option) {
                        onAnswerChange(question.id, option);
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id={`question-${question.id}`}
                      className={cn(
                        "w-full",
                        errors[question.id] ? "border-destructive" : "",
                        isOverlay && REGISTRATION_OVERLAY_FIELD_CLASS,
                      )}
                    >
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {(question.options ?? []).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors[question.id] && (
                    <p className="text-xs text-destructive">{errors[question.id]}</p>
                  )}
                </div>
              );
            }

            if (questionType === "social") {
              const handle =
                typeof customAnswers[question.id] === "string"
                  ? (customAnswers[question.id] as string)
                  : "";
              const network = question.network ?? "linkedin";
              return (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={`question-${question.id}`}>
                    {question.label}
                    {question.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <SocialHandleField
                    id={network}
                    value={ProfileLinks.handle(network, handle || null)}
                    onValueChange={(next) => onAnswerChange(question.id, next)}
                    required={question.required}
                    disabled={isSubmitting}
                  />
                  {errors[question.id] && (
                    <p className="text-xs text-destructive">{errors[question.id]}</p>
                  )}
                </div>
              );
            }

            const textValue =
              typeof customAnswers[question.id] === "string"
                ? (customAnswers[question.id] as string)
                : "";

            return (
              <div key={question.id} className="space-y-2">
                <Label htmlFor={`question-${question.id}`}>
                  {question.label}
                  {question.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {isOverlay ? (
                  <Input
                    id={`question-${question.id}`}
                    name={`question-${question.id}`}
                    value={textValue}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    placeholder="Your answer..."
                    required={question.required}
                    disabled={isSubmitting}
                    maxLength={MAX_ANSWER_LENGTH}
                    className={cn(
                      errors[question.id] ? "border-destructive" : "",
                      REGISTRATION_OVERLAY_FIELD_CLASS,
                    )}
                  />
                ) : (
                  <Textarea
                    id={`question-${question.id}`}
                    name={`question-${question.id}`}
                    value={textValue}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    placeholder="Your answer..."
                    required={question.required}
                    disabled={isSubmitting}
                    maxLength={MAX_ANSWER_LENGTH}
                    rows={2}
                    className={errors[question.id] ? "border-destructive" : ""}
                  />
                )}
                {errors[question.id] && (
                  <p className="text-xs text-destructive">{errors[question.id]}</p>
                )}
                {!isOverlay && textValue && (
                  <p className="text-xs text-muted-foreground">
                    {textValue.length}/{MAX_ANSWER_LENGTH} characters
                  </p>
                )}
              </div>
            );
          })}
    </div>
  );
}
