import { Resend } from "resend";
import { render } from "@react-email/components";
import type React from "react";
import { EventVerificationEmail } from "~/templates/event-verification-email";
import { EventConfirmationEmail } from "~/templates/event-confirmation-email";
import { EventStatusUpdateEmail } from "~/templates/event-status-update-email";
import { EventUpdateEmail } from "~/templates/event-update-email";
import { EventReminderEmail } from "~/templates/event-reminder-email";
import { EventRegistrationRequestEmail } from "~/templates/event-registration-request-email";
import { EventPaymentRequestEmail } from "~/templates/event-payment-request-email";
import { CommunityWaitlistNotification } from "~/templates/community-waitlist-notification";
import { CommunityJoinNotification } from "~/templates/community-join-notification";
import { CommunityAnnouncementEmail } from "~/templates/community-announcement-email";
import { CollaborationInviteEmail } from "~/templates/collaboration-invite-email";
import { EventInviteEmail } from "~/templates/event-invite-email";
import { CollaborationAcceptedEmail } from "~/templates/collaboration-accepted-email";
import { NewEventNotificationEmail } from "~/templates/new-event-notification-email";
import { NewCollaborationEventEmail } from "~/templates/new-collaboration-event-email";
import { EventRegistrationNotificationEmail } from "~/templates/event-registration-notification-email";
import { generateICS } from "~/modules/events/utils/ics-manager";
import {
  buildUnsubscribeListHeaders,
  buildUnsubscribeUrl,
  getEmailOrigin,
} from "~/shared/lib/email/unsubscribe-token.server";
import QRCode from "qrcode";

// Utility function to mask sensitive values for logging
function maskValue(value: string | undefined, showLength = true): string {
  if (!value) return "undefined";
  if (value.length <= 8) return "***";
  const prefix = value.substring(0, 4);
  const suffix = value.substring(value.length - 4);
  return showLength ? `${prefix}...${suffix} (length: ${value.length})` : `${prefix}...${suffix}`;
}

// Validate email format (basic check)
function isValidEmailFormat(email: string): boolean {
  // Check if it contains @ symbol (basic validation)
  if (!email.includes("@")) return false;

  // If formatted as "Name <email>", extract the email part
  const emailMatch = email.match(/<([^>]+)>/);
  const emailToCheck = emailMatch ? emailMatch[1] : email;

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(emailToCheck);
}

// Environment variable validation
interface EmailConfig {
  resendApiKey: string | undefined;
  emailSender: string | undefined;
  isValid: boolean;
  errors: string[];
}

function validateEmailConfig(): EmailConfig {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailSender = process.env.EMAIL_SENDER;
  const errors: string[] = [];
  let isValid = true;

  // Check RESEND_API_KEY
  if (!resendApiKey) {
    errors.push("RESEND_API_KEY is not set in environment variables");
    isValid = false;
  } else if (resendApiKey.trim().length === 0) {
    errors.push("RESEND_API_KEY is empty");
    isValid = false;
  }

  // Check EMAIL_SENDER format if provided
  if (emailSender) {
    const formattedEmail = getFromEmail();
    if (!isValidEmailFormat(formattedEmail)) {
      errors.push(`EMAIL_SENDER format is invalid. Got: "${emailSender}", formatted as: "${formattedEmail}". Email must contain @ symbol.`);
      isValid = false;
    }
  }

  // Log validation results
  if (!isValid) {
    console.error("❌ Email configuration validation failed:");
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error(`  RESEND_API_KEY: ${maskValue(resendApiKey)}`);
    console.error(`  EMAIL_SENDER: ${emailSender || "undefined"}`);
  } else {
    console.log("✅ Email configuration validated successfully");
    console.log(`  RESEND_API_KEY: ${maskValue(resendApiKey)}`);
    console.log(`  EMAIL_SENDER: ${emailSender || "using fallback"}`);
  }

  return {
    resendApiKey,
    emailSender,
    isValid,
    errors,
  };
}

// Format email sender: if EMAIL_SENDER is provided and not already formatted,
// wrap it with "Luhive <" and ">". Otherwise use the provided format or fallback.
function getFromEmail(): string {
  const emailSender = process.env.EMAIL_SENDER;
  if (!emailSender) {
    return "Luhive <events@events.luhive.com>";
  }
  // If already formatted with angle brackets, use as-is
  if (emailSender.includes("<") && emailSender.includes(">")) {
    return emailSender;
  }
  // Otherwise, format it as "Luhive <email>"
  return `Luhive <${emailSender}>`;
}

// Validate configuration on module load
const emailConfig = validateEmailConfig();

// Initialize Resend client only if API key exists
let resend: Resend | null = null;
if (emailConfig.resendApiKey) {
  try {
    resend = new Resend(emailConfig.resendApiKey);
    console.log("✅ Resend client initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Resend client:", error);
  }
} else {
  console.error("❌ Resend client not initialized: RESEND_API_KEY is missing");
}

const FROM_EMAIL = getFromEmail();
const FROM_EMAIL_ADDRESS =
  FROM_EMAIL.match(/<([^>]+)>/)?.[1] || FROM_EMAIL;

/** Display-name as the community; Luhive stays in the footer only. */
function fromCommunity(communityName: string): string {
  return `${communityName} <${FROM_EMAIL_ADDRESS}>`;
}

/**
 * Core email sending types and helpers
 */

type BaseEmailPayload = {
  to: string | string[];
  subject: string;
  /**
   * Use either `react` (preferred) or `html` for the body, not both.
   */
  react?: React.ReactElement;
  html?: string;
  /**
   * Plain-text alternative part. Auto-generated from `react`/`html` when
   * omitted — HTML-only emails score worse with spam filters.
   */
  text?: string;
  attachments?: {
    filename: string;
    content: string;
    contentId?: string;
  }[];
  tags?: string[];
  /**
   * Optional contextual metadata for logging
   */
  metadata?: Record<string, unknown>;
  /**
   * Optional custom from address. Format: "Name <email@example.com>"
   * If not provided, defaults to FROM_EMAIL
   */
  from?: string;
  headers?: Record<string, string>;
};

type EmailSendResult = {
  to: string;
  success: boolean;
  id?: string;
  error?: {
    message: string;
    name?: string;
  };
};

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const labelText = label.replace(/<[^>]+>/g, "").trim();
      if (!labelText || labelText === href) return href;
      return `${labelText}: ${href}`;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&mdash;/gi, "—")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function withPlainText(payload: BaseEmailPayload): Promise<BaseEmailPayload> {
  if (payload.text) return payload;
  try {
    if (payload.react) {
      return { ...payload, text: await render(payload.react, { plainText: true }) };
    }
    if (payload.html) {
      return { ...payload, text: htmlToPlainText(payload.html) };
    }
  } catch (error) {
    console.warn("⚠️ Failed to generate plain-text part, sending HTML-only:", {
      error: error instanceof Error ? error.message : String(error),
      subject: payload.subject,
    });
  }
  return payload;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function sendEmailsInternal(
  rawPayloads: BaseEmailPayload[]
): Promise<EmailSendResult[]> {
  if (rawPayloads.length === 0) return [];

  if (!resend) {
    const errorMsg =
      "Resend client not initialized. Check RESEND_API_KEY environment variable.";
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  if (!isValidEmailFormat(FROM_EMAIL)) {
    const errorMsg = `Invalid FROM_EMAIL format: ${FROM_EMAIL}`;
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const payloads = await Promise.all(rawPayloads.map(withPlainText));

  const results: EmailSendResult[] = [];
  const chunks = chunkArray(payloads, 100);
  const batchStart = Date.now();

  console.log(
    `📨 Sending ${payloads.length} email(s) via unified email service in ${chunks.length} chunk(s)...`
  );

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const chunkStart = Date.now();
    const isSingle = chunk.length === 1;
    console.log(
      `   Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} email(s)) - mode: ${
        isSingle ? "single" : "batch"
      }`
    );

    if (isSingle) {
      const payload = chunk[0]!;
      try {
        const toArray = Array.isArray(payload.to) ? payload.to : [payload.to];

        const { data, error } = await resend.emails.send({
          from: payload.from ?? FROM_EMAIL,
          to: toArray,
          subject: payload.subject,
          react: payload.react,
          html: payload.html,
          text: payload.text,
          headers: payload.headers,
          attachments:
            payload.attachments && payload.attachments.length > 0
              ? payload.attachments
              : undefined,
        } as any);

        if (error) {
          const errorDetails: Record<string, unknown> = {
            message: (error as any).message,
          };
          if ("name" in (error as any) && typeof (error as any).name === "string") {
            errorDetails.name = (error as any).name;
          }
          console.error("❌ Resend API error (single):", errorDetails, {
            to: payload.to,
            subject: payload.subject,
            metadata: payload.metadata,
          });
          results.push({
            to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
            success: false,
            error: {
              message: (error as any).message,
              name: (error as any).name,
            },
          });
        } else {
          console.log("✅ Email sent successfully (single):", {
            id: (data as any)?.id,
            to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
            subject: payload.subject,
            metadata: payload.metadata,
          });
          results.push({
            to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
            success: true,
            id: (data as any)?.id,
          });
        }
      } catch (error) {
        console.error("❌ Error sending email (single):", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          to: payload.to,
          subject: payload.subject,
          metadata: payload.metadata,
        });
        results.push({
          to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
          success: false,
          error: {
            message:
              error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : undefined,
          },
        });
      }
    } else {
      try {
        const batchPayload = chunk.map((payload) => ({
          from: payload.from ?? FROM_EMAIL,
          to: Array.isArray(payload.to) ? payload.to : [payload.to],
          subject: payload.subject,
          react: payload.react,
          html: payload.html,
          text: payload.text,
          headers: payload.headers,
          attachments:
            payload.attachments && payload.attachments.length > 0
              ? payload.attachments
              : undefined,
        }));

        const { data, error } = await (resend as any).batch.send(
          batchPayload
        );

        if (error) {
          const errorDetails: Record<string, unknown> = {
            message: (error as any).message,
          };
          if ("name" in (error as any) && typeof (error as any).name === "string") {
            errorDetails.name = (error as any).name;
          }
          console.warn("⚠️ Resend batch API error, falling back to individual sends:", errorDetails, {
            chunkSize: chunk.length,
          });

          for (const payload of chunk) {
            try {
              const toArray = Array.isArray(payload.to) ? payload.to : [payload.to];
              const { data: singleData, error: singleError } = await resend.emails.send({
                from: payload.from ?? FROM_EMAIL,
                to: toArray,
                subject: payload.subject,
                react: payload.react,
                html: payload.html,
                text: payload.text,
                headers: payload.headers,
                attachments:
                  payload.attachments && payload.attachments.length > 0
                    ? payload.attachments
                    : undefined,
              } as any);

              if (singleError) {
                console.error("❌ Fallback individual send failed:", {
                  message: (singleError as any).message,
                  to: payload.to,
                });
                results.push({
                  to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
                  success: false,
                  error: {
                    message: (singleError as any).message,
                    name: (singleError as any).name,
                  },
                });
              } else {
                results.push({
                  to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
                  success: true,
                  id: (singleData as any)?.id,
                });
              }
            } catch (singleErr) {
              console.error("❌ Fallback individual send threw:", {
                error: singleErr instanceof Error ? singleErr.message : String(singleErr),
                to: payload.to,
              });
              results.push({
                to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
                success: false,
                error: {
                  message: singleErr instanceof Error ? singleErr.message : String(singleErr),
                  name: singleErr instanceof Error ? singleErr.name : undefined,
                },
              });
            }
          }
        } else {
          const items: any[] = Array.isArray(data) ? data : [];
          console.log("✅ Batch email send succeeded:", {
            chunkSize: chunk.length,
            returned: items.length,
          });

          chunk.forEach((payload, index) => {
            const item = items[index];
            results.push({
              to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
              success: true,
              id: item?.id,
            });
          });
        }
      } catch (error) {
        console.warn("⚠️ Batch send threw, falling back to individual sends:", {
          error: error instanceof Error ? error.message : String(error),
          chunkSize: chunk.length,
        });
        for (const payload of chunk) {
          try {
            const toArray = Array.isArray(payload.to) ? payload.to : [payload.to];
            const { data: singleData, error: singleError } = await resend.emails.send({
              from: payload.from ?? FROM_EMAIL,
              to: toArray,
              subject: payload.subject,
              react: payload.react,
              html: payload.html,
              text: payload.text,
              headers: payload.headers,
              attachments:
                payload.attachments && payload.attachments.length > 0
                  ? payload.attachments
                  : undefined,
            } as any);

            if (singleError) {
              results.push({
                to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
                success: false,
                error: {
                  message: (singleError as any).message,
                  name: (singleError as any).name,
                },
              });
            } else {
              results.push({
                to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
                success: true,
                id: (singleData as any)?.id,
              });
            }
          } catch (singleErr) {
            results.push({
              to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
              success: false,
              error: {
                message: singleErr instanceof Error ? singleErr.message : String(singleErr),
                name: singleErr instanceof Error ? singleErr.name : undefined,
              },
            });
          }
        }
      }

      const chunkEnd = Date.now();
      console.log(
        `   ⏱️ Chunk ${chunkIndex + 1}/${chunks.length} completed in ${
          (chunkEnd - chunkStart) / 1000
        }s`
      );
    }
  }

  const batchEnd = Date.now();
  console.log(
    `📨 Unified email service finished: total=${payloads.length}, success=${
      results.filter((r) => r.success).length
    }, failed=${results.filter((r) => !r.success).length
    }, durationSec=${(batchEnd - batchStart) / 1000}`
  );

  return results;
}

async function sendEmail(payload: BaseEmailPayload): Promise<EmailSendResult> {
  const [result] = await sendEmailsInternal([payload]);
  return result;
}

async function sendEmailBatch(
  payloads: BaseEmailPayload[]
): Promise<EmailSendResult[]> {
  return sendEmailsInternal(payloads);
}

/**
 * Plan-aligned helper names
 * These wrap the core helpers above to match the documented API in the plan.
 */
async function sendEmailInternal(
  payload: BaseEmailPayload
): Promise<EmailSendResult> {
  return sendEmail(payload);
}

async function sendEmailsBatch(
  payloads: BaseEmailPayload[]
): Promise<EmailSendResult[]> {
  return sendEmailBatch(payloads);
}

// Export configuration for debugging
export function getEmailConfig() {
  return {
    ...emailConfig,
    fromEmail: FROM_EMAIL,
    resendInitialized: resend !== null,
    maskedApiKey: maskValue(emailConfig.resendApiKey),
  };
}

interface VerificationEmailData {
  eventTitle: string;
  communityName: string;
  verificationLink: string;
  recipientName: string;
  recipientEmail: string;
  registerAccountLink: string;
}

interface ConfirmationEmailData {
  eventTitle: string;
  communityName: string;
  eventDate: string;
  eventTime: string;
  eventLink: string;
  recipientName: string;
  recipientEmail: string;
  registerAccountLink: string;
  locationAddress?: string;
  locationMapUrl?: string;
  onlineMeetingLink?: string;
  startTimeISO: string;
  endTimeISO: string;
  checkinToken?: string | null;
  ticketPrice?: string;
  isPaidManually?: boolean;
  isPayAtDoor?: boolean;
}

interface StatusUpdateEmailData {
  eventTitle: string;
  communityName: string;
  eventLink: string;
  recipientName: string;
  recipientEmail: string;
  status: "approved" | "rejected";
  eventDate?: string;
  eventTime?: string;
  locationAddress?: string;
  onlineMeetingLink?: string;
  startTimeISO?: string;
  endTimeISO?: string;
  checkinToken?: string | null;
}

interface EventScheduleUpdateEmailData {
  eventTitle: string;
  communityName: string;
  eventDate: string;
  eventTime: string;
  eventLink: string;
  recipientName: string;
  recipientEmail: string;
  locationAddress?: string;
  locationMapUrl?: string;
  onlineMeetingLink?: string;
}

interface RegistrationRequestEmailData {
  eventTitle: string;
  communityName: string;
  eventLink: string;
  recipientName: string;
  recipientEmail: string;
  eventDate?: string;
  eventTime?: string;
}

interface CommunityWaitlistNotificationData {
  communityName: string;
  userName: string;
  userEmail: string;
  website?: string | null;
  description?: string | null;
  submittedAt: string;
}

interface CommunityJoinNotificationData {
  communityName: string;
  communitySlug: string;
  memberName: string;
  memberEmail: string;
  ownerEmail: string;
  joinedAt: string;
}

interface CollaborationInviteEmailData {
  eventTitle: string;
  hostCommunityName: string;
  coHostCommunityName: string;
  recipientEmail: string;
  inviteLink: string;
  eventLink: string;
  invitedByName: string;
}

interface EventInviteEmailData {
  eventTitle: string;
  communityName: string;
  recipientName: string;
  recipientEmail: string;
  inviteLink: string;
  eventLink: string;
  invitedByName: string;
  eventDate: string;
  eventTime: string;
}

interface CollaborationAcceptedEmailData {
  eventTitle: string;
  hostCommunityName: string;
  coHostCommunityName: string;
  recipientEmail: string;
  eventLink: string;
}

interface NewEventNotificationEmailData {
  eventTitle: string;
  communityName: string;
  communityId: string;
  eventDate: string;
  eventTime: string;
  eventLink: string;
  recipientEmail: string;
  recipientName: string;
  recipientUserId: string;
  emailOrigin?: string;
  locationAddress?: string;
  locationMapUrl?: string;
  onlineMeetingLink?: string;
}

interface NewCollaborationEventEmailData {
  eventTitle: string;
  hostCommunityName: string;
  coHostCommunityName: string;
  communityId: string;
  communityName: string;
  eventDate: string;
  eventTime: string;
  eventLink: string;
  recipientEmail: string;
  recipientName: string;
  recipientUserId: string;
  emailOrigin?: string;
  isNewEvent: boolean;
  locationAddress?: string;
  onlineMeetingLink?: string;
}

interface EventRegistrationNotificationEmailData {
  eventTitle: string;
  registrantName: string;
  registrantEmail: string;
  hostCommunityName: string;
  coHostCommunityNames: string[];
  eventDate: string;
  eventTime: string;
  eventLink: string;
  recipientEmail: string;
  recipientName: string;
  ticketPrice?: string;
  registrationCount?: number;
  totalGain?: string;
  paymentStatus?: "receipt_sent" | "pays_at_door" | "marked_paid";
}

interface PaymentRequestEmailData {
  eventTitle: string;
  communityName: string;
  eventLink: string;
  recipientName: string;
  recipientEmail: string;
  ticketPrice: string;
  paymentInstructions: string | null;
  eventDate: string;
  eventTime: string;
}

interface AnnouncementNotificationEmailData {
  title: string;
  description: string;
  communityName: string;
  communityId: string;
  announcementLink: string;
  recipientEmail: string;
  recipientName?: string;
  imageUrls?: string[];
  createdAt?: string;
  communityLogo?: string;
  announcementId?: string;
  userId?: string;
  recipientUserId?: string;
  emailOrigin?: string;
}

export async function sendRegistrationRequestEmail(
  data: RegistrationRequestEmailData
) {
  const {
    eventTitle,
    communityName,
    eventLink,
    recipientName,
    recipientEmail,
    eventDate,
    eventTime,
  } = data;

  const from = fromCommunity(communityName);

  console.log(`📧 Attempting to send registration request email:`, {
    to: recipientEmail,
    from,
    subject: `You're pending approval: ${eventTitle}`,
  });

  const result = await sendEmailInternal({
    to: recipientEmail,
    subject: `You're pending approval: ${eventTitle}`,
    from,
    react: EventRegistrationRequestEmail({
      eventTitle,
      communityName,
      eventLink,
      recipientName,
      eventDate,
      eventTime,
    }),
    metadata: {
      template: "EventRegistrationRequestEmail",
      eventTitle,
      communityName,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send request email:", {
      to: recipientEmail,
      fromEmail: from,
      error: result.error,
    });
    throw new Error(
      `Failed to send request email: ${result.error?.message || "Unknown error"}`
    );
  }

  console.log(`✅ Registration request email sent successfully:`, {
    id: result.id,
    from,
    to: recipientEmail,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendPaymentRequestEmail(data: PaymentRequestEmailData) {
  const subject = `Complete your payment: ${data.eventTitle}`;
  const from = fromCommunity(data.communityName);

  const result = await sendEmailInternal({
    to: data.recipientEmail,
    subject,
    from,
    react: EventPaymentRequestEmail({
      eventTitle: data.eventTitle,
      communityName: data.communityName,
      eventLink: data.eventLink,
      recipientName: data.recipientName,
      ticketPrice: data.ticketPrice,
      paymentInstructions: data.paymentInstructions,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
    }),
    metadata: {
      template: "EventPaymentRequestEmail",
      eventTitle: data.eventTitle,
      communityName: data.communityName,
    },
  });

  if (!result.success) {
    throw new Error(
      `Failed to send payment request email: ${result.error?.message || "Unknown error"}`
    );
  }

  return { success: true, data: { id: result.id } };
}

export async function sendVerificationEmail(data: VerificationEmailData) {
  const {
    eventTitle,
    communityName,
    verificationLink,
    recipientName,
    recipientEmail,
    registerAccountLink,
  } = data;

  const from = fromCommunity(communityName);

  console.log(`📧 Attempting to send verification email:`, {
    to: recipientEmail,
    from,
    subject: `Verify your registration for ${eventTitle}`,
  });

  const result = await sendEmailInternal({
    to: recipientEmail,
    subject: `Verify your registration for ${eventTitle}`,
    from,
    react: EventVerificationEmail({
      eventTitle,
      communityName,
      verificationLink,
      recipientName,
      registerAccountLink,
    }),
    metadata: {
      template: "EventVerificationEmail",
      eventTitle,
      communityName,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send verification email:", {
      to: recipientEmail,
      fromEmail: from,
      error: result.error,
    });
    throw new Error(
      `Failed to send verification email: ${
        result.error?.message || "Unknown error"
      }`
    );
  }

  console.log(`✅ Verification email sent successfully:`, {
    id: result.id,
    from,
    to: recipientEmail,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendEventStatusUpdateEmail(data: StatusUpdateEmailData) {
  const {
    eventTitle,
    communityName,
    eventLink,
    recipientName,
    recipientEmail,
    status,
    eventDate,
    eventTime,
    locationAddress,
    onlineMeetingLink,
    startTimeISO,
    endTimeISO,
    checkinToken,
  } = data;

  const attachments: { filename: string; content: string; contentId?: string }[] = [];
  let hasQrCode = false;

  // Add ICS attachment if approved and dates are provided
  if (status === "approved" && startTimeISO && endTimeISO) {
    console.log(`   Generating ICS attachment...`);
    const icsContent = generateICS({
      title: eventTitle,
      description: `${eventTitle}\n\nHosted by: ${communityName}\n\nView event details: ${eventLink}`,
      location: locationAddress || onlineMeetingLink || "Online Event",
      startTime: startTimeISO,
      endTime: endTimeISO,
      url: eventLink,
      organizerName: communityName,
      organizerEmail: "events@luhive.com",
    });

    attachments.push({
      filename: `${eventTitle.replace(/[^a-z0-9]/gi, "_")}.ics`,
      content: Buffer.from(icsContent).toString("base64"),
    });
    console.log(`   ICS attachment created`);
  }

  if (status === "approved" && checkinToken) {
    const qrBuffer = await QRCode.toBuffer(checkinToken, { width: 300, margin: 1 });
    // Inline QR (for clients supporting CID rendering in body)
    attachments.push({
      filename: "event-checkin-qr-inline.png",
      content: qrBuffer.toString("base64"),
      contentId: "event-qr",
    });
    // Fallback downloadable QR attachment
    attachments.push({
      filename: "event-checkin-qr.png",
      content: qrBuffer.toString("base64"),
    });
    hasQrCode = true;
    console.log(`   QR attachment created`);
  }

  const subject =
    status === "approved"
      ? `You're accepted: ${eventTitle}`
      : `You weren't accepted: ${eventTitle}`;


  console.log(`📧 Attempting to send status update email:`, {
    to: recipientEmail,
    from: fromCommunity(communityName),
    status,
    subject,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    from: fromCommunity(communityName),
    react: EventStatusUpdateEmail({
      eventTitle,
      communityName,
      eventLink,
      recipientName,
      status,
      eventDate,
      eventTime,
      locationAddress,
      onlineMeetingLink,
      hasQrCode,
    }),
    attachments,
    metadata: {
      template: "EventStatusUpdateEmail",
      eventTitle,
      communityName,
      status,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send status update email:", {
      to: recipientEmail,
      fromEmail: FROM_EMAIL,
      status,
      error: result.error,
    });
    throw new Error(
      `Failed to send status update email: ${
        result.error?.message || "Unknown error"
      }`
    );
  }

  console.log(`✅ Status update email sent successfully:`, {
    id: result.id,
    from: fromCommunity(communityName),
    to: recipientEmail,
    status,
    hasAttachment: attachments.length > 0,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendEventScheduleUpdateEmail(
  data: EventScheduleUpdateEmailData
) {
  const {
    eventTitle,
    communityName,
    eventDate,
    eventTime,
    eventLink,
    recipientName,
    recipientEmail,
    locationAddress,
    locationMapUrl,
    onlineMeetingLink,
  } = data;


  console.log(`📧 Attempting to send event schedule update email:`, {
    to: recipientEmail,
    from: fromCommunity(communityName),
    subject: `Event updated: ${eventTitle}`,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject: `Event updated: ${eventTitle}`,
    from: fromCommunity(communityName),
    react: EventUpdateEmail({
      eventTitle,
      communityName,
      eventDate,
      eventTime,
      eventLink,
      recipientName,
      locationAddress,
      locationMapUrl,
      onlineMeetingLink,
    }),
    metadata: {
      template: "EventUpdateEmail",
      eventTitle,
      communityName,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send event schedule update email:", {
      to: recipientEmail,
      fromEmail: FROM_EMAIL,
      error: result.error,
    });
    throw new Error(
      `Failed to send event schedule update email: ${
        result.error?.message || "Unknown error"
      }`
    );
  }

  console.log(`✅ Event schedule update email sent successfully:`, {
    id: result.id,
    from: fromCommunity(communityName),
    to: recipientEmail,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendEventReminderEmail(data: {
  eventTitle: string;
  communityName: string;
  communityLogoUrl?: string | null;
  eventDate: string;
  eventTime: string;
  eventLink: string;
  recipientName: string;
  recipientEmail: string;
  message?: string;
  locationAddress?: string;
  locationMapUrl?: string;
  reminderTime?: "1-hour" | "3-hours" | "5-hours" | "1-day" | "3-days" | "5-days";
}) {
  const {
    eventTitle,
    communityName,
    communityLogoUrl,
    eventDate,
    eventTime,
    eventLink,
    recipientName,
    recipientEmail,
    message,
    locationAddress,
    locationMapUrl,
    reminderTime = "1-hour",
  } = data;


  console.log(`📧 Attempting to send event reminder email:`, {
    to: recipientEmail,
    from: fromCommunity(communityName),
    subject: `Reminder: ${eventTitle}`,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject: `Reminder: ${eventTitle}`,
    from: fromCommunity(communityName),
    react: EventReminderEmail({
      eventTitle,
      communityName,
      communityLogoUrl: communityLogoUrl || null,
      eventDate,
      eventTime,
      eventLink,
      recipientName,
      locationAddress,
      locationMapUrl,
      reminderTime,
    }),
    metadata: {
      template: "EventReminderEmail",
      eventTitle,
      communityName,
      message,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send event reminder email:", {
      to: recipientEmail,
      fromEmail: FROM_EMAIL,
      error: result.error,
    });
    throw new Error(
      `Failed to send reminder email: ${
        result.error?.message || "Unknown error"
      }`
    );
  }

  console.log(`✅ Event reminder email sent successfully:`, {
    id: result.id,
    from: fromCommunity(communityName),
    to: recipientEmail,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendRegistrationConfirmationEmail(
  data: ConfirmationEmailData
) {
  const {
    eventTitle,
    communityName,
    eventDate,
    eventTime,
    eventLink,
    recipientName,
    recipientEmail,
    registerAccountLink,
    locationAddress,
    locationMapUrl,
    onlineMeetingLink,
    startTimeISO,
    endTimeISO,
    checkinToken,
    ticketPrice,
    isPaidManually,
    isPayAtDoor,
  } = data;

  const from = fromCommunity(communityName);

  console.log(`📧 Attempting to send confirmation email:`, {
    to: recipientEmail,
    from,
    subject: `You're registered: ${eventTitle}`,
  });

  // Generate ICS file content
  console.log(`   Generating ICS attachment...`);
  const icsContent = generateICS({
    title: eventTitle,
    description: `${eventTitle}\n\nHosted by: ${communityName}\n\nView event details: ${eventLink}`,
    location: locationAddress || onlineMeetingLink || "Online Event",
    startTime: startTimeISO,
    endTime: endTimeISO,
    url: eventLink,
    organizerName: communityName,
    organizerEmail: "events@luhive.com",
  });
  console.log(`   ICS attachment created`);

  const attachments: { filename: string; content: string; contentId?: string }[] = [
    {
      filename: `${eventTitle.replace(/[^a-z0-9]/gi, "_")}.ics`,
      content: Buffer.from(icsContent).toString("base64"),
    },
  ];

  let hasQrCode = false;
  if (checkinToken) {
    const qrBuffer = await QRCode.toBuffer(checkinToken, { width: 300, margin: 1 });
    // Inline QR (for clients supporting CID rendering in body)
    attachments.push({
      filename: "event-checkin-qr-inline.png",
      content: qrBuffer.toString("base64"),
      contentId: "event-qr",
    });
    // Fallback downloadable QR attachment
    attachments.push({
      filename: "event-checkin-qr.png",
      content: qrBuffer.toString("base64"),
    });
    hasQrCode = true;
    console.log(`   QR attachment created`);
  }

  const confirmationEmailProps = {
    eventTitle,
    communityName,
    eventDate,
    eventTime,
    eventLink,
    recipientName,
    registerAccountLink,
    locationAddress,
    locationMapUrl,
    onlineMeetingLink,
    hasQrCode,
    ticketPrice,
    isPaidManually,
    isPayAtDoor,
  };

  const result = await sendEmail({
    to: recipientEmail,
    subject: `You're registered: ${eventTitle}`,
    from,
    react: EventConfirmationEmail(confirmationEmailProps),
    attachments,
    metadata: {
      template: "EventConfirmationEmail",
      eventTitle,
      communityName,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send confirmation email:", {
      to: recipientEmail,
      fromEmail: from,
      error: result.error,
    });
    throw new Error(
      `Failed to send confirmation email: ${
        result.error?.message || "Unknown error"
      }`
    );
  }

  console.log(`✅ Confirmation email sent successfully:`, {
    id: result.id,
    from,
    to: recipientEmail,
    hasAttachment: attachments.length > 0,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendCommunityWaitlistNotification(
  data: CommunityWaitlistNotificationData
) {
  const {
    communityName,
    userName,
    userEmail,
    website,
    description,
    submittedAt,
  } = data;

  const recipientEmail = "luhive.startup@gmail.com";
  console.log(`📧 Attempting to send waitlist notification email:`, {
    to: recipientEmail,
    from: FROM_EMAIL,
    subject: `New community request: ${communityName}`,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject: `New community request: ${communityName}`,
    react: CommunityWaitlistNotification({
      communityName,
      userName,
      userEmail,
      website,
      description,
      submittedAt,
    }),
    metadata: {
      template: "CommunityWaitlistNotification",
      communityName,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send waitlist notification email:", {
      to: recipientEmail,
      fromEmail: FROM_EMAIL,
      communityName,
      error: result.error,
    });
    throw new Error(
      `Failed to send waitlist notification email: ${
        result.error?.message || "Unknown error"
      }`
    );
  }

  console.log(`✅ Waitlist notification email sent successfully:`, {
    id: result.id,
    from: FROM_EMAIL,
    to: recipientEmail,
    communityName,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendCommunityJoinNotification(
  data: CommunityJoinNotificationData
) {
  const {
    communityName,
    communitySlug,
    memberName,
    memberEmail,
    ownerEmail,
    joinedAt,
  } = data;

  const dashboardLink = `${process.env.APP_URL || "https://luhive.com"}/dashboard/${communitySlug}/members`;
  const from = fromCommunity(communityName);

  console.log(`📧 Attempting to send community join notification email:`, {
    to: ownerEmail,
    from,
    subject: `New member joined ${communityName}`,
  });

  const result = await sendEmail({
    to: ownerEmail,
    subject: `New member joined ${communityName}`,
    from,
    react: CommunityJoinNotification({
      communityName,
      communitySlug,
      memberName,
      memberEmail,
      joinedAt,
      dashboardLink,
    }),
    metadata: {
      template: "CommunityJoinNotification",
      communityName,
      memberName,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send community join notification email:", {
      to: ownerEmail,
      fromEmail: from,
      communityName,
      memberName,
      error: result.error,
    });
    throw new Error(
      `Failed to send community join notification email: ${
        result.error?.message || "Unknown error"
      }`
    );
  }

  console.log(`✅ Community join notification email sent successfully:`, {
    id: result.id,
    from,
    to: ownerEmail,
    communityName,
    memberName,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendCollaborationInviteEmail(
  data: CollaborationInviteEmailData
) {
  const {
    eventTitle,
    hostCommunityName,
    coHostCommunityName,
    recipientEmail,
    inviteLink,
    eventLink,
    invitedByName,
  } = data;


  console.log(`📧 Attempting to send collaboration invite email:`, {
    to: recipientEmail,
    from: fromCommunity(hostCommunityName),
    subject: `Collaboration invite: ${eventTitle}`,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject: `Collaboration invite: ${eventTitle}`,
    from: fromCommunity(hostCommunityName),
    react: CollaborationInviteEmail({
      eventTitle,
      hostCommunityName,
      coHostCommunityName,
      recipientEmail,
      inviteLink,
      eventLink,
      invitedByName,
    }),
    metadata: {
      template: "CollaborationInviteEmail",
      eventTitle,
      hostCommunityName,
      coHostCommunityName,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send collaboration invite email:", {
      to: recipientEmail,
      fromEmail: fromCommunity(hostCommunityName),
      error: result.error,
    });
    throw new Error(
      `Failed to send collaboration invite email: ${
        result.error?.message || "Unknown error"
      }`
    );
  }

  console.log(`✅ Collaboration invite email sent successfully:`, {
    id: result.id,
    from: fromCommunity(hostCommunityName),
    to: recipientEmail,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendEventInviteEmail(data: EventInviteEmailData) {
  const {
    eventTitle,
    communityName,
    recipientName,
    recipientEmail,
    inviteLink,
    eventLink,
    invitedByName,
    eventDate,
    eventTime,
  } = data;


  console.log(`📧 Attempting to send event invite email:`, {
    to: recipientEmail,
    from: fromCommunity(communityName),
    subject: `You're invited to ${eventTitle}`,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject: `You're invited to ${eventTitle}`,
    from: fromCommunity(communityName),
    react: EventInviteEmail({
      eventTitle,
      communityName,
      recipientName,
      recipientEmail,
      inviteLink,
      eventLink,
      invitedByName,
      eventDate,
      eventTime,
    }),
    metadata: {
      template: "EventInviteEmail",
      eventTitle,
      communityName,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send event invite email:", {
      to: recipientEmail,
      error: result.error,
    });
    throw new Error(
      `Failed to send event invite email: ${
        result.error?.message || "Unknown error"
      }`,
    );
  }

  console.log(`✅ Event invite email sent successfully:`, {
    id: result.id,
    to: recipientEmail,
  });

  return { success: true, data: { id: result.id } };
}

export async function sendCollaborationAcceptedEmail(
  data: CollaborationAcceptedEmailData
) {
  const {
    eventTitle,
    hostCommunityName,
    coHostCommunityName,
    recipientEmail,
    eventLink,
  } = data;


  console.log(`📧 Attempting to send collaboration accepted email:`, {
    to: recipientEmail,
    from: fromCommunity(hostCommunityName),
    subject: `Collaboration accepted: ${eventTitle}`,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject: `Collaboration accepted: ${eventTitle}`,
    from: fromCommunity(hostCommunityName),
    react: CollaborationAcceptedEmail({
      eventTitle,
      hostCommunityName,
      coHostCommunityName,
      recipientEmail,
      eventLink,
    }),
    metadata: {
      template: "CollaborationAcceptedEmail",
      eventTitle,
      hostCommunityName,
      coHostCommunityName,
    },
  });

  if (!result.success) {
    console.error("❌ Failed to send collaboration accepted email:", {
      to: recipientEmail,
      fromEmail: fromCommunity(hostCommunityName),
      error: result.error,
    });
    throw new Error(
      `Failed to send collaboration accepted email: ${
        result.error?.message || "Unknown error"
      }`
    );
  }

  console.log(`✅ Collaboration accepted email sent successfully:`, {
    id: result.id,
    from: fromCommunity(hostCommunityName),
    to: recipientEmail,
  });

  return { success: true, data: { id: result.id } };
}

/**
 * Send notification to community members about a new event created by their community.
 * Supports both single and batch sending.
 */
export async function sendNewEventNotificationEmail(
  data: NewEventNotificationEmailData | NewEventNotificationEmailData[]
) {
  const items = Array.isArray(data) ? data : [data];


  const payloads: BaseEmailPayload[] = items.map(
    ({
      eventTitle,
      communityName,
      communityId,
      eventDate,
      eventTime,
      eventLink,
      recipientEmail,
      recipientName,
      recipientUserId,
      emailOrigin,
      locationAddress,
      locationMapUrl,
      onlineMeetingLink,
    }) => {
      const origin = emailOrigin ?? getEmailOrigin();
      const unsubscribeUrl = buildUnsubscribeUrl(
        origin,
        communityId,
        recipientUserId,
      );

      return {
      to: recipientEmail,
      subject: `New event: ${eventTitle}`,
      from: fromCommunity(communityName),
      headers: buildUnsubscribeListHeaders(unsubscribeUrl),
      react: NewEventNotificationEmail({
        eventTitle,
        communityName,
        eventDate,
        eventTime,
        eventLink,
        recipientName,
        locationAddress,
        locationMapUrl,
        onlineMeetingLink,
        unsubscribeUrl,
      }),
      metadata: {
        template: "NewEventNotificationEmail",
        eventTitle,
        communityName,
      },
    };
    },
  );

  console.log(
    `📧 Attempting to send new event notification emails (count: ${payloads.length})`
  );

  const results = await sendEmailBatch(payloads);

  let successCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.success) {
      successCount += 1;
    } else {
      errorCount += 1;
    }
  }

  if (errorCount > 0) {
    console.error(
      `❌ Some new event notification emails failed: success=${successCount}, failed=${errorCount}`
    );
  }

  return { successCount, errorCount, results };
}

export async function sendAnnouncementNotificationEmail(
  data: AnnouncementNotificationEmailData | AnnouncementNotificationEmailData[]
) {
  const items = Array.isArray(data) ? data : [data];


  const payloads: BaseEmailPayload[] = items.map(
    ({
      title,
      description,
      communityName,
      communityId,
      announcementLink,
      recipientEmail,
      imageUrls,
      createdAt,
      communityLogo,
      announcementId,
      userId,
      recipientUserId,
      emailOrigin,
    }) => {
      const resolvedUserId = userId ?? recipientUserId ?? "";
      const origin = emailOrigin ?? getEmailOrigin();
      const unsubscribeUrl = buildUnsubscribeUrl(
        origin,
        communityId,
        resolvedUserId,
      );

      return {
      to: recipientEmail,
      subject: `${title}`,
      from: fromCommunity(communityName),
      headers: buildUnsubscribeListHeaders(unsubscribeUrl),
      react: CommunityAnnouncementEmail({
        title,
        description,
        communityName,
        announcementLink,
        imageUrls: imageUrls || [],
        createdAt,
        communityLogo,
        announcementId,
        userId: resolvedUserId,
        unsubscribeUrl,
      }),
      metadata: {
        template: "CommunityAnnouncementEmail",
        communityName,
        announcementId,
      },
    };
    },
  );

  console.log(
    `📧 Attempting to send announcement notification emails (count: ${payloads.length})`
  );

  const results = await sendEmailBatch(payloads);

  let successCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.success) {
      successCount += 1;
    } else {
      errorCount += 1;
    }
  }

  if (errorCount > 0) {
    console.error(
      `❌ Some announcement notification emails failed: success=${successCount}, failed=${errorCount}`
    );
  }

  return { successCount, errorCount, results };
}

/**
 * Send notification to community members when a co-host accepts collaboration on a new event
 */
export async function sendNewCollaborationEventEmail(
  data: NewCollaborationEventEmailData | NewCollaborationEventEmailData[]
) {
  const items = Array.isArray(data) ? data : [data];


  const payloads: BaseEmailPayload[] = items.map(
    ({
      eventTitle,
      hostCommunityName,
      coHostCommunityName,
      communityId,
      communityName,
      eventDate,
      eventTime,
      eventLink,
      recipientEmail,
      recipientName,
      recipientUserId,
      emailOrigin,
      isNewEvent,
      locationAddress,
      onlineMeetingLink,
    }) => {
      const eventType = isNewEvent ? "New Event" : "Event Update";
      const origin = emailOrigin ?? getEmailOrigin();
      const unsubscribeUrl = buildUnsubscribeUrl(
        origin,
        communityId,
        recipientUserId,
      );

      return {
        to: recipientEmail,
        subject: `${eventType}: ${eventTitle} (${coHostCommunityName} joined)`,
        from: fromCommunity(hostCommunityName),
        headers: buildUnsubscribeListHeaders(unsubscribeUrl),
        react: NewCollaborationEventEmail({
          eventTitle,
          hostCommunityName,
          coHostCommunityName,
          eventDate,
          eventTime,
          eventLink,
          recipientName,
          isNewEvent,
          locationAddress,
          onlineMeetingLink,
          unsubscribeUrl,
        }),
        metadata: {
          template: "NewCollaborationEventEmail",
          eventTitle,
          hostCommunityName,
          coHostCommunityName,
          isNewEvent,
        },
      };
    }
  );

  console.log(
    `📧 Attempting to send collaboration event emails (count: ${payloads.length})`
  );

  const results = await sendEmailBatch(payloads);

  let successCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.success) {
      successCount += 1;
    } else {
      errorCount += 1;
    }
  }

  if (errorCount > 0) {
    console.error(
      `❌ Some collaboration event emails failed: success=${successCount}, failed=${errorCount}`
    );
  }

  return { successCount, errorCount, results };
}

/**
 * Send notification to host and co-host owners/admins when someone registers for their event
 */
export async function sendEventRegistrationNotificationEmail(
  data:
    | EventRegistrationNotificationEmailData
    | EventRegistrationNotificationEmailData[]
) {
  const items = Array.isArray(data) ? data : [data];

  const payloads: BaseEmailPayload[] = items.map(
    ({
      eventTitle,
      registrantName,
      registrantEmail,
      hostCommunityName,
      coHostCommunityNames,
      eventDate,
      eventTime,
      eventLink,
      recipientEmail,
      recipientName,
      ticketPrice,
      registrationCount,
      totalGain,
      paymentStatus,
    }) => {
      return {
        to: recipientEmail,
        subject:
          paymentStatus === "receipt_sent"
            ? `Receipt received: ${eventTitle}`
            : paymentStatus === "pays_at_door"
              ? `Pays at the door: ${eventTitle}`
              : `New registration: ${eventTitle}`,
        from: fromCommunity(hostCommunityName),
        react: EventRegistrationNotificationEmail({
          eventTitle,
          registrantName,
          registrantEmail,
          hostCommunityName,
          coHostCommunityNames,
          eventDate,
          eventTime,
          eventLink,
          recipientName,
          ticketPrice,
          registrationCount,
          totalGain,
          paymentStatus,
        }),
        metadata: {
          template: "EventRegistrationNotificationEmail",
          eventTitle,
          hostCommunityName,
        },
      };
    }
  );

  console.log(
    `📧 Attempting to send event registration notification emails (count: ${payloads.length})`
  );

  const results = await sendEmailBatch(payloads);

  let successCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.success) {
      successCount += 1;
    } else {
      errorCount += 1;
    }
  }

  if (errorCount > 0) {
    console.error(
      `❌ Some registration notification emails failed: success=${successCount}, failed=${errorCount}`
    );
  }

  return { successCount, errorCount, results };
}
