import type {
  CustomQuestion,
  CustomQuestionJson,
  CustomAnswerJson,
  DropdownOption,
} from '~/modules/events/model/event.types';
import { ProfileLinks } from '~/modules/profile/model/profile-social-links';
import type { Database } from '~/shared/models/database.types';
import { MAX_ANSWER_LENGTH } from './custom-questions-constants';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';

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

/** Numbers typed without a country code ("050 123 45 67") are read as Azerbaijani. */
const DEFAULT_PHONE_COUNTRY: CountryCode = 'AZ';

export const PHONE_INVALID_MESSAGE =
  'Enter a valid phone number, e.g. 050 123 45 67 or +994 50 123 45 67';

function parsePhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return undefined;
  // "00" is the international dialing prefix ("00994…" = "+994…").
  const withPlus = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed;
  return parsePhoneNumberFromString(withPlus, DEFAULT_PHONE_COUNTRY);
}

/** The number in E.164 ("+994501234567"), or null when it is not a valid phone number. */
export function toE164Phone(phone: string): string | null {
  const parsed = parsePhone(phone);
  return parsed?.isValid() ? parsed.number : null;
}

/** Accepts local Azerbaijani ("050…"), "00…" and "+…" numbers; checks length per country. */
export function isValidPhoneNumber(phone: string): boolean {
  return toE164Phone(phone) !== null;
}

/** Error text for a phone field on blur/submit, or null when empty or valid. */
export function phoneInputError(phone: string): string | null {
  return phone.trim() && !isValidPhoneNumber(phone) ? PHONE_INVALID_MESSAGE : null;
}

/**
 * Readable international form: "+994 50 123 45 67".
 * Falls back to the input for numbers it cannot parse (e.g. old stored answers).
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const parsed = parsePhone(phone);
  return parsed?.isValid() ? parsed.formatInternational() : phone;
}

/**
 * Filters what the user types without reformatting it, so the caret never jumps.
 * Keeps digits, a leading "+", and the separators people naturally type.
 */
export function normalizePhoneInput(value: string): string {
  const kept = value.replace(/[^\d+\s()-]/g, '');
  const leadingPlus = kept.trimStart().startsWith('+');
  return (leadingPlus ? '+' : '') + kept.replace(/\+/g, '').slice(0, 24);
}

/** On blur: tidy a valid number into international form; leave anything else for the user to fix. */
export function formatPhoneInputOnBlur(value: string): string {
  const parsed = parsePhone(value);
  return parsed?.isValid() ? parsed.formatInternational() : value.trim();
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
    // Store one canonical form so organizers' exports and dedupes stay consistent.
    answers.phone = toE164Phone(phone) ?? phone.trim();
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
      errors.phone = PHONE_INVALID_MESSAGE;
    }
  } else if (config.phone.enabled && answers.phone && !isValidPhoneNumber(answers.phone)) {
    errors.phone = PHONE_INVALID_MESSAGE;
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
