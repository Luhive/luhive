import { useState, useEffect } from 'react';
import { Label } from '~/shared/components/ui/label';
import { Switch } from '~/shared/components/ui/switch';
import { Button } from '~/shared/components/ui/button';
import { Input } from '~/shared/components/ui/input';
import { Checkbox } from '~/shared/components/ui/checkbox';
import { Card } from '~/shared/components/ui/card';
import { Separator } from '~/shared/components/ui/separator';
import { Mail, Phone, Plus, Trash2, AlertCircle, CircleDot, AlignLeft, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '~/shared/lib/utils/cn';
import type {
  CustomQuestionJson,
  PhoneQuestionConfig,
  CustomQuestion,
  CustomQuestionType,
} from '~/modules/events/model/event.types';
import {
  createNewCustomQuestion,
  createNewDropdownQuestion,
  createNewDropdownOption,
  createNewSocialQuestion,
} from '~/modules/events/utils/custom-questions';
import { isTemplateQuestion } from '~/modules/events/model/hackathon-team';
import { ProfileLinks } from '~/modules/profile/model/profile-social-links';
import {
  MAX_CUSTOM_QUESTIONS,
  MIN_QUESTION_LABEL_LENGTH,
  MAX_QUESTION_LABEL_LENGTH,
  MIN_DROPDOWN_OPTIONS,
  MAX_DROPDOWN_OPTIONS,
  MAX_OPTION_LENGTH,
} from '~/modules/events/utils/custom-questions-constants';

interface CustomQuestionsBuilderProps {
  value: CustomQuestionJson | null;
  onChange: (value: CustomQuestionJson | null) => void;
}

export function CustomQuestionsBuilder({
  value,
  onChange,
}: CustomQuestionsBuilderProps) {
  const [phoneConfig, setPhoneConfig] = useState<PhoneQuestionConfig>(
    value?.phone || { enabled: false, required: false }
  );
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>(
    value?.custom || []
  );
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);

  const handlePhoneEnabledChange = (enabled: boolean) => {
    const newConfig: PhoneQuestionConfig = {
      enabled,
      required: enabled ? phoneConfig.required : false,
    };
    setPhoneConfig(newConfig);
    updateValue(newConfig, customQuestions);
  };

  const handlePhoneRequiredChange = (required: boolean) => {
    const newConfig: PhoneQuestionConfig = { ...phoneConfig, required };
    setPhoneConfig(newConfig);
    updateValue(newConfig, customQuestions);
  };

  const handleAddQuestion = (type: CustomQuestionType = 'text') => {
    if (customQuestions.length >= MAX_CUSTOM_QUESTIONS) {
      toast.error(`Maximum ${MAX_CUSTOM_QUESTIONS} custom questions allowed`);
      return;
    }
    const newQuestion =
      type === 'dropdown'
        ? createNewDropdownQuestion(customQuestions.length)
        : type === 'social'
          ? createNewSocialQuestion(customQuestions.length)
          : createNewCustomQuestion(customQuestions.length);
    const updatedQuestions = [...customQuestions, newQuestion];
    setCustomQuestions(updatedQuestions);
    updateValue(phoneConfig, updatedQuestions);
    setHighlightedQuestionId(newQuestion.id);
  };

  useEffect(() => {
    if (!highlightedQuestionId) return;

    const card = document.getElementById(`question-card-${highlightedQuestionId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = card.querySelector('input');
      if (input instanceof HTMLInputElement) {
        input.focus({ preventScroll: true });
      }
    }

    const timer = setTimeout(() => setHighlightedQuestionId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedQuestionId]);

  const handleDeleteQuestion = (questionId: string) => {
    const updatedQuestions = customQuestions
      .filter((q) => q.id !== questionId)
      .map((q, index) => ({ ...q, order: index }));
    setCustomQuestions(updatedQuestions);
    updateValue(phoneConfig, updatedQuestions);
  };

  const updateQuestion = (questionId: string, patch: Partial<CustomQuestion>) => {
    const updatedQuestions = customQuestions.map((q) =>
      q.id === questionId ? { ...q, ...patch } : q
    );
    setCustomQuestions(updatedQuestions);
    updateValue(phoneConfig, updatedQuestions);
  };

  const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
    const question = customQuestions.find((q) => q.id === questionId);
    if (!question || !question.options) return;
    const newOptions = [...question.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], label: value };
    updateQuestion(questionId, { options: newOptions });
  };

  const handleAddOption = (questionId: string) => {
    const question = customQuestions.find((q) => q.id === questionId);
    if (!question) return;
    const currentOptions = question.options ?? [];
    if (currentOptions.length >= MAX_DROPDOWN_OPTIONS) {
      toast.error(`Maximum ${MAX_DROPDOWN_OPTIONS} options allowed`);
      return;
    }
    updateQuestion(questionId, { options: [...currentOptions, createNewDropdownOption()] });
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    const question = customQuestions.find((q) => q.id === questionId);
    if (!question || !question.options) return;
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    updateQuestion(questionId, { options: newOptions });
  };

  const updateValue = (phone: PhoneQuestionConfig, custom: CustomQuestion[]) => {
    if (!phone.enabled && custom.length === 0) {
      onChange(null);
    } else {
      onChange({ phone, custom });
    }
  };

  const validateQuestionLabel = (label: string): string | null => {
    if (label.trim().length < MIN_QUESTION_LABEL_LENGTH)
      return `Question must be at least ${MIN_QUESTION_LABEL_LENGTH} characters`;
    if (label.trim().length > MAX_QUESTION_LABEL_LENGTH)
      return `Question must be no more than ${MAX_QUESTION_LABEL_LENGTH} characters`;
    return null;
  };

  const hasInvalidQuestions = customQuestions.some((q) => {
    if (q.label.trim() && validateQuestionLabel(q.label) !== null) return true;
    if ((q.type ?? 'text') === 'dropdown') {
      const validOptions = (q.options ?? []).filter((o) => o.label.trim().length > 0);
      return validOptions.length < MIN_DROPDOWN_OPTIONS;
    }
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Email — always collected */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </Label>
          <p className="text-sm text-muted-foreground">
            Always collected — required for registration
          </p>
        </div>
        <Switch checked disabled aria-label="Email is always collected" />
      </div>

      {/* Phone Number Collection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="phone-toggle" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Collect Phone Number
            </Label>
            <p className="text-sm text-muted-foreground">
              Ask registrants for their phone number
            </p>
          </div>
          <Switch
            id="phone-toggle"
            checked={phoneConfig.enabled}
            onCheckedChange={handlePhoneEnabledChange}
          />
        </div>

        {phoneConfig.enabled && (
          <div className="space-y-2 pl-6 border-l-2 border-muted">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="phone-required">Required</Label>
                <p className="text-sm text-muted-foreground">
                  Make phone number mandatory for registration
                </p>
              </div>
              <Switch
                id="phone-required"
                checked={phoneConfig.required}
                onCheckedChange={handlePhoneRequiredChange}
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Custom Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Custom Questions</Label>
            <p className="text-sm text-muted-foreground">
              Add up to {MAX_CUSTOM_QUESTIONS} custom questions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddQuestion('text')}
              disabled={customQuestions.length >= MAX_CUSTOM_QUESTIONS}
            >
              <AlignLeft className="h-4 w-4 mr-2" />
              Text
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddQuestion('dropdown')}
              disabled={customQuestions.length >= MAX_CUSTOM_QUESTIONS}
            >
              <CircleDot className="h-4 w-4 mr-2" />
              Options
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddQuestion('social')}
              disabled={customQuestions.length >= MAX_CUSTOM_QUESTIONS}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Social
            </Button>
          </div>
        </div>

        {customQuestions.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
            No custom questions added yet
          </div>
        )}

        {customQuestions.length > 0 && (
          <div className="space-y-3">
            {customQuestions.map((question, index) => {
              const questionType = question.type ?? 'text';
              const validationError = validateQuestionLabel(question.label);
              const showLabelError = question.label.trim() && validationError;

              return (
                <div
                  key={question.id}
                  id={`question-card-${question.id}`}
                  className={cn(
                    'rounded-xl transition-[box-shadow,ring] duration-500',
                    highlightedQuestionId === question.id &&
                      'ring-2 ring-primary/60 shadow-md'
                  )}
                >
                <Card className="p-4">
                  <div className="space-y-4">
                    {/* Header row: type badge + question label + delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`question-${question.id}`}>
                            Question {index + 1}
                          </Label>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {questionType === 'dropdown' ? (
                              <>
                                <CircleDot className="h-3 w-3" />
                                Options
                              </>
                            ) : questionType === 'social' ? (
                              <>
                                <Link2 className="h-3 w-3" />
                                Social
                              </>
                            ) : (
                              <>
                                <AlignLeft className="h-3 w-3" />
                                Text
                              </>
                            )}
                          </span>
                          {showLabelError && (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {validationError}
                            </div>
                          )}
                        </div>
                        <Input
                          id={`question-${question.id}`}
                          value={question.label}
                          onChange={(e) =>
                            updateQuestion(question.id, { label: e.target.value })
                          }
                          placeholder="Enter your question (5-200 characters)"
                          maxLength={MAX_QUESTION_LABEL_LENGTH}
                          className={showLabelError ? 'border-destructive' : ''}
                        />
                        <p className="text-xs text-muted-foreground">
                          {question.label.length}/{MAX_QUESTION_LABEL_LENGTH} characters
                          {question.label.length > 0 &&
                            question.label.length < MIN_QUESTION_LABEL_LENGTH && (
                              <span className="text-destructive ml-2">
                                (minimum {MIN_QUESTION_LABEL_LENGTH} characters)
                              </span>
                            )}
                        </p>
                      </div>
                      {!isTemplateQuestion(question.id) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete question</span>
                      </Button>
                      ) : null}
                    </div>

                    {/* Dropdown-specific controls */}
                    {questionType === 'social' && (
                      <div className="space-y-2">
                        <Label className="text-sm">Network</Label>
                        <div className="flex gap-2">
                          {ProfileLinks.ids.map((network) => (
                            <Button
                              key={network}
                              type="button"
                              size="sm"
                              variant={question.network === network ? 'default' : 'outline'}
                              disabled={isTemplateQuestion(question.id)}
                              onClick={() => updateQuestion(question.id, { network })}
                            >
                              {ProfileLinks.prefix(network)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {questionType === 'dropdown' && (
                      <div className="space-y-3 pl-0">
                        {/* Options list */}
                        <div className="space-y-2">
                          <Label className="text-sm">Options</Label>
                          {(question.options ?? []).map((option, optionIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <Input
                                value={option.label}
                                onChange={(e) =>
                                  handleOptionChange(question.id, optionIndex, e.target.value)
                                }
                                placeholder={`Option ${optionIndex + 1}`}
                                maxLength={MAX_OPTION_LENGTH}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveOption(question.id, optionIndex)}
                                className="text-muted-foreground hover:text-destructive shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove option</span>
                              </Button>
                            </div>
                          ))}
                          {(question.options ?? []).length === 0 && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Add at least one option
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddOption(question.id)}
                            disabled={(question.options ?? []).length >= MAX_DROPDOWN_OPTIONS}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add option
                          </Button>
                        </div>

                        {/* Selection type: Single / Multiple */}
                        <div className="space-y-1.5">
                          <Label className="text-sm">Selection Type</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant={!question.allowMultiple ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateQuestion(question.id, { allowMultiple: false })}
                              className="w-full"
                            >
                              Single
                            </Button>
                            <Button
                              type="button"
                              variant={question.allowMultiple ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateQuestion(question.id, { allowMultiple: true })}
                              className="w-full"
                            >
                              Multiple
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Required toggle */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`required-${question.id}`}
                        checked={question.required}
                        onCheckedChange={(checked) =>
                          updateQuestion(question.id, { required: checked === true })
                        }
                      />
                      <Label
                        htmlFor={`required-${question.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Required field
                      </Label>
                    </div>
                  </div>
                </Card>
                </div>
              );
            })}
          </div>
        )}

        {customQuestions.length >= MAX_CUSTOM_QUESTIONS && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Maximum of {MAX_CUSTOM_QUESTIONS} custom questions reached</span>
          </div>
        )}
      </div>
    </div>
  );
}
