import type {
  CustomQuestion,
  CustomQuestionJson,
  CustomAnswerJson,
  DropdownOption,
} from '~/modules/events/model/event.types';
import { ProfileLinks } from '~/modules/profile/model/profile-social-links';
import type { Database } from '~/shared/models/database.types';
import { MAX_ANSWER_LENGTH } from './custom-questions-constants';

type EventRegistration = Database['public']['Tables']['event_registrations']['Row'];

function isDropdownOption(value: unknown): value is DropdownOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'label' in value &&
    typeof (value as DropdownOption).id === 'string' &&
    typeof (value as DropdownOption).label === 'string'
  );
}

function getDropdownSelections(answer: unknown): DropdownOption[] {
  if (Array.isArray(answer)) {
    return answer.filter(isDropdownOption);
  }
  return isDropdownOption(answer) ? [answer] : [];
}

export function formatAnswerForDisplay(answer: unknown): string {
  if (Array.isArray(answer)) {
    return answer
      .map((v) => (isDropdownOption(v) ? v.label : String(v)))
      .join(', ');
  }
  if (isDropdownOption(answer)) {
    return answer.label;
  }
  return typeof answer === 'string' ? answer : '-';
}

export function createNewDropdownOption(): DropdownOption {
  return { id: crypto.randomUUID(), label: '' };
}

export function createNewCustomQuestion(order: number): CustomQuestion {
  return {
    id: crypto.randomUUID(),
    label: '',
    required: false,
    order,
    type: 'text',
  };
}

export function createNewDropdownQuestion(order: number): CustomQuestion {
  return {
    id: crypto.randomUUID(),
    label: '',
    required: false,
    order,
    type: 'dropdown',
    options: [],
    allowMultiple: false,
  };
}

export function createNewSocialQuestion(order: number, network: ProfileLinks.Id = "linkedin"): CustomQuestion {
  return {
    id: crypto.randomUUID(),
    label: '',
    required: false,
    order,
    type: 'social',
    network,
  };
}

/**
 * Validates phone number in E.164 format
 * E.164 format: +[country code][number] (e.g., +994501234567)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: starts with +, followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone.trim());
}

/**
 * Formats phone number for display
 * Converts +994501234567 to +994 50 123 45 67
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // If it doesn't start with +, return as is
  if (!cleaned.startsWith('+')) {
    return phone;
  }

  // Extract country code (first 1-3 digits after +)
  const match = cleaned.match(/^\+(\d{1,3})(\d+)$/);
  if (!match) return phone;

  const [, countryCode, number] = match;

  // Format the number part with spaces every 2 digits
  const formattedNumber = number.match(/.{1,2}/g)?.join(' ') || number;

  return `+${countryCode} ${formattedNumber}`;
}

export function normalizePhoneInput(value: string): string {
  let cleaned = value.replace(/[^\d+]/g, "");

  if (cleaned && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned.replace(/\+/g, "");
  }

  return cleaned;
}

export function buildCustomAnswersFromFormState(
  customQuestions: CustomQuestionJson | null,
  phone: string,
  formAnswers: Record<string, string | DropdownOption | DropdownOption[]>,
): CustomAnswerJson {
  const answers: CustomAnswerJson = {};

  if (!customQuestions) {
    return answers;
  }

  if (customQuestions.phone.enabled && phone.trim()) {
    answers.phone = phone.trim();
  }

  if (customQuestions.custom && customQuestions.custom.length > 0) {
    for (const question of customQuestions.custom) {
      const answer = formAnswers[question.id];
      const questionType = question.type ?? "text";

      if (questionType === "dropdown") {
        if (Array.isArray(answer) && answer.length > 0) {
          answers[question.id] = answer;
        } else if (
          answer &&
          typeof answer === "object" &&
          !Array.isArray(answer) &&
          "id" in answer
        ) {
          answers[question.id] = answer;
        }
      } else if (questionType === "social") {
        const handle = typeof answer === "string" ? answer.trim() : "";
        const url = handle ? ProfileLinks.url(question.network ?? "linkedin", handle) : null;
        if (url) answers[question.id] = url;
      } else if (typeof answer === "string" && answer.trim()) {
        answers[question.id] = answer.trim();
      }
    }
  }

  return answers;
}

/**
 * Validates custom answers against the question configuration
 */
export function validateCustomAnswers(
  answers: CustomAnswerJson,
  config: CustomQuestionJson | null
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!config) {
    return { valid: true, errors };
  }

  // Validate phone if enabled and required
  if (config.phone.enabled && config.phone.required) {
    if (!answers.phone || !answers.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!isValidPhoneNumber(answers.phone)) {
      errors.phone = 'Please enter a valid phone number in international format (e.g., +994501234567)';
    }
  } else if (config.phone.enabled && answers.phone && !isValidPhoneNumber(answers.phone)) {
    errors.phone = 'Please enter a valid phone number in international format (e.g., +994501234567)';
  }

  // Validate custom questions
  if (config.custom && config.custom.length > 0) {
    for (const question of config.custom) {
      const answer = answers[question.id];
      const questionType = question.type ?? 'text';

      if (questionType === 'dropdown') {
        const selected = getDropdownSelections(answer);
        const validIds = (question.options ?? []).map((o) => o.id);

        if (question.required && selected.length === 0) {
          errors[question.id] = 'This field is required';
        } else if (selected.some((v) => !validIds.includes(v.id))) {
          errors[question.id] = 'Invalid option selected';
        }
      } else if (questionType === 'social') {
        const handle = typeof answer === 'string' ? answer.trim() : '';
        const url = handle ? ProfileLinks.url(question.network ?? 'linkedin', handle) : null;
        if (question.required && !url) {
          errors[question.id] = 'Paste a profile link';
        } else if (handle && !url) {
          errors[question.id] = 'Paste a profile link';
        }
      } else {
        const textAnswer =
          typeof answer === 'string'
            ? answer
            : Array.isArray(answer)
              ? undefined
              : undefined;

        if (question.required) {
          if (!textAnswer || !textAnswer.trim()) {
            errors[question.id] = 'This field is required';
          } else if (textAnswer.length > MAX_ANSWER_LENGTH) {
            errors[question.id] = `Answer must be ${MAX_ANSWER_LENGTH} characters or less`;
          }
        } else if (textAnswer && textAnswer.length > MAX_ANSWER_LENGTH) {
          errors[question.id] = `Answer must be ${MAX_ANSWER_LENGTH} characters or less`;
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Generates CSV/Excel column headers for custom questions
 */
export function getCSVHeaders(questions: CustomQuestionJson | null): string[] {
  if (!questions) return [];

  const headers: string[] = [];

  if (questions.phone.enabled) {
    headers.push('Phone');
  }

  if (questions.custom && questions.custom.length > 0) {
    // Sort by order to maintain consistent column order
    const sortedQuestions = [...questions.custom].sort((a, b) => a.order - b.order);
    for (const question of sortedQuestions) {
      headers.push(question.label);
    }
  }

  return headers;
}

/**
 * Flattens custom answers for Excel export
 */
export function flattenCustomAnswers(
  registration: EventRegistration,
  questions: CustomQuestionJson | null
): Record<string, string> {
  const flattened: Record<string, string> = {};

  if (!questions || !registration.custom_answers) {
    return flattened;
  }

  const answers = registration.custom_answers as CustomAnswerJson;

  if (questions.phone.enabled) {
    if (answers.phone) {
      flattened['Phone'] = formatPhoneNumber(answers.phone);
    } else {
      flattened['Phone'] = '-';
    }
  }

  if (questions.custom && questions.custom.length > 0) {
    const sortedQuestions = [...questions.custom].sort((a, b) => a.order - b.order);
    for (const question of sortedQuestions) {
      const answer = answers[question.id];
      const formatted = formatAnswerForDisplay(answer);
      flattened[question.label] = formatted || '-';
    }
  }

  return flattened;
}
