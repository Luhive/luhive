import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import type { ActionFunctionArgs } from "react-router";
import { getCommunityMemberEmailsWithIds } from "~/modules/community/utils/community-members";
import { sendNewCollaborationEventEmail } from "~/shared/lib/email.server";
import { sendRegistrationOrganizerNotifications } from "~/modules/events/server/send-registration-notification.server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    console.log("=== collaboration-notification.tsx received ===");
    console.log("body:", JSON.stringify(body, null, 2));
    
    const {
      type,
      eventId,
      hostCommunityId,
      coHostCommunityId,
      eventTitle,
      eventDate,
      eventTime,
      eventLink,
      locationAddress,
      onlineMeetingLink,
      // For registration notifications
      registrantName,
      registrantEmail,
      hostCommunityName,
      coHostCommunityNames,
    } = body;

    const serviceClient = createServiceRoleClient();
    const emailOrigin = publicOrigin(request);

    console.log("type:", type);
    console.log("coHostCommunityId:", coHostCommunityId);

    if (type === "collaboration-accepted-new-event") {
      // Notify both host and co-host community members when collaboration is accepted on NEW event
      // Send to all co-host community members
      if (coHostCommunityId) {
        console.log("Fetching co-host community member emails for:", coHostCommunityId);
        const coHostEmails = await getCommunityMemberEmailsWithIds(coHostCommunityId, serviceClient);
        console.log("coHostEmails:", coHostEmails);
        
        const { data: coHostCommunity } = await serviceClient
          .from("communities")
          .select("name")
          .eq("id", coHostCommunityId)
          .single();
        
        const { data: hostCommunity } = await serviceClient
          .from("communities")
          .select("name")
          .eq("id", hostCommunityId)
          .single();

        const coHostName = coHostCommunity?.name || "Co-host Community";
        const hostName = hostCommunity?.name || "Host Community";
        
        console.log("Sending emails to co-host members:", coHostEmails.length);

        const coHostPayloads = coHostEmails.map(({ email, userId }) => ({
          eventTitle,
          hostCommunityName: hostName,
          coHostCommunityName: coHostName,
          communityId: coHostCommunityId,
          communityName: coHostName,
          eventDate,
          eventTime,
          eventLink,
          recipientEmail: email,
          recipientName: email.split("@")[0],
          recipientUserId: userId,
          emailOrigin,
          isNewEvent: true,
          locationAddress,
          onlineMeetingLink,
        }));

        await sendNewCollaborationEventEmail(coHostPayloads);
      }

      // Send to all host community members
      if (hostCommunityId) {
        console.log("Fetching host community member emails for:", hostCommunityId);
        const hostEmails = await getCommunityMemberEmailsWithIds(hostCommunityId, serviceClient);
        console.log("hostEmails:", hostEmails);
        
        const { data: coHostCommunity } = await serviceClient
          .from("communities")
          .select("name")
          .eq("id", coHostCommunityId)
          .single();
        
        const { data: hostCommunity } = await serviceClient
          .from("communities")
          .select("name")
          .eq("id", hostCommunityId)
          .single();

        const coHostName = coHostCommunity?.name || "Co-host Community";
        const hostName = hostCommunity?.name || "Host Community";
        
        console.log("Sending emails to host members:", hostEmails.length);

        const hostPayloads = hostEmails.map(({ email, userId }) => ({
          eventTitle,
          hostCommunityName: hostName,
          coHostCommunityName: coHostName,
          communityId: hostCommunityId,
          communityName: hostName,
          eventDate,
          eventTime,
          eventLink,
          recipientEmail: email,
          recipientName: email.split("@")[0],
          recipientUserId: userId,
          emailOrigin,
          isNewEvent: true,
          locationAddress,
          onlineMeetingLink,
        }));

        await sendNewCollaborationEventEmail(hostPayloads);
      }

      return { success: true, message: "Collaboration notifications sent" };
    }

    if (type === "collaboration-accepted-existing-event") {
      // Notify only co-host community members when collaboration is accepted on EXISTING event
      console.log("Processing collaboration-accepted-existing-event");
      console.log("coHostCommunityId:", coHostCommunityId);
      
      if (coHostCommunityId) {
        console.log("Fetching co-host community member emails for existing event:", coHostCommunityId);
        const coHostEmails = await getCommunityMemberEmailsWithIds(coHostCommunityId, serviceClient);
        console.log("coHostEmails for existing event:", coHostEmails);
        
        const { data: coHostCommunity } = await serviceClient
          .from("communities")
          .select("name")
          .eq("id", coHostCommunityId)
          .single();
        
        const { data: hostCommunity } = await serviceClient
          .from("communities")
          .select("name")
          .eq("id", hostCommunityId)
          .single();

        const coHostName = coHostCommunity?.name || "Co-host Community";
        const hostName = hostCommunity?.name || "Host Community";

        console.log("Sending emails to co-host members for existing event:", coHostEmails.length);

        const existingCoHostPayloads = coHostEmails.map(({ email, userId }) => ({
          eventTitle,
          hostCommunityName: hostName,
          coHostCommunityName: coHostName,
          communityId: coHostCommunityId,
          communityName: coHostName,
          eventDate,
          eventTime,
          eventLink,
          recipientEmail: email,
          recipientName: email.split("@")[0],
          recipientUserId: userId,
          emailOrigin,
          isNewEvent: false,
          locationAddress,
          onlineMeetingLink,
        }));

        await sendNewCollaborationEventEmail(existingCoHostPayloads);
      }

      return { success: true, message: "Collaboration notifications sent" };
    }

    if (type === "registration-notification") {
      await sendRegistrationOrganizerNotifications({
        hostCommunityId,
        hostCommunityName,
        coHostCommunityNames: coHostCommunityNames ?? [],
        eventTitle,
        registrantName,
        registrantEmail,
        eventDate,
        eventTime,
        eventLink,
      });

      return { success: true, message: "Registration notifications sent" };
    }

    return new Response("Invalid notification type", { status: 400 });
  } catch (error) {
    console.error("Error in collaboration-notification API:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
