import type { ProfileLinks } from "~/modules/profile/model/profile-social-links";

export type RegistrationType = "native" | "external" | "both";

export type ExternalPlatform =
  | "google_forms"
  | "microsoft_forms"
  | "luma"
  | "eventbrite"
  | "other";

export type CustomQuestionType = 'text' | 'dropdown' | 'social';

export interface DropdownOption {
  id: string;
  label: string;
}

export interface PhoneQuestionConfig {
  enabled: boolean;
  required: boolean;
}

export interface CustomQuestion {
  id: string; // UUID
  label: string;
  required: boolean;
  order: number;
  type?: CustomQuestionType;  // undefined treated as 'text' for backward compat
  network?: ProfileLinks.Id; // social only
  options?: DropdownOption[]; // dropdown only
  allowMultiple?: boolean;    // dropdown only: false = Single, true = Multiple
}

export interface CustomQuestionJson {
  phone: PhoneQuestionConfig;
  custom: CustomQuestion[];
}

export interface CustomAnswerJson {
  phone?: string; // E.164 format: +994501234567
  [questionId: string]: string | DropdownOption | DropdownOption[] | undefined;
}

// Type aliases for convenience
export type CustomQuestionsConfig = CustomQuestionJson;
export type CustomAnswers = CustomAnswerJson;
