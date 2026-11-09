import type { ActionFunctionArgs } from "react-router";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { resolvePublicEvent } from "~/modules/events/server/resolve-public-event.server";
import {
  completeInviteRegistration,
  loadInviteWithEvent,
} from "~/modules/events/server/event-invite-accept.server";
import type { CustomAnswerJson } from "~/modules/events/model/event.types";

export async function handleAcceptInviteAction({
  request,
  params,
  formData,
  userId,
  userEmail,
}: {
  request: Request;
  params: ActionFunctionArgs["params"];
  formData: FormData;
  userId: string;
  userEmail: string;
}) {
  const token = ((formData.get("inviteToken") as string) || "").trim();

  if (!token) {
    return { success: false, error: "Invitation token is required." };
  }

  const communitySlug = (params as { slug?: string }).slug;
  const eventSlug = (params as { eventSlug?: string }).eventSlug;

  if (!communitySlug || !eventSlug) {
    return { success: false, error: "Event not found." };
  }

  const serviceClient = createServiceRoleClient();
  const resolved = await resolvePublicEvent(serviceClient, communitySlug, eventSlug, {
    publishedOnly: true,
  });

  if (!resolved) {
    return { success: false, error: "Event not found." };
  }

  const { invite, event, error } = await loadInviteWithEvent(
    token,
    resolved.event.id,
  );

  if (!invite || !event || error) {
    return { success: false, error: error || "Invalid invitation." };
  }

  let customAnswers: CustomAnswerJson | null = null;
  const customAnswersStr = formData.get("custom_answers") as string | null;

  if (customAnswersStr) {
    try {
      customAnswers = JSON.parse(customAnswersStr) as CustomAnswerJson;
    } catch {
      return { success: false, error: "Invalid custom answers." };
    }
  }

  if (event.custom_questions && customAnswers) {
    const { validateCustomAnswers, toE164Phone } = await import(
      "~/modules/events/utils/custom-questions"
    );
    const validation = validateCustomAnswers(
      customAnswers,
      event.custom_questions as import("~/modules/events/model/event.types").CustomQuestionJson,
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.phone ?? "Please fill in all required fields.",
        validationErrors: validation.errors,
      };
    }

    const canonicalPhone = customAnswers.phone ? toE164Phone(customAnswers.phone) : null;
    if (canonicalPhone) customAnswers = { ...customAnswers, phone: canonicalPhone };
  } else if (event.custom_questions) {
    return { success: false, error: "Please fill in all required fields." };
  }

  const joinCommunity = formData.get("joinCommunity") !== "false";

  return completeInviteRegistration({
    request,
    invite,
    event,
    userId,
    userEmail,
    customAnswers,
    joinCommunity,
  });
}
