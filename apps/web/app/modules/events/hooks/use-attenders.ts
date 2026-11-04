import { useState, useEffect, useCallback } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { utils, writeFile } from "xlsx";
import type { Attender } from "~/modules/events/model/attender.types";
import { rsvpStatusConfig, approvalStatusConfig } from "~/modules/events/model/attender.types";
import {
  getAttendersCustomQuestions,
  getAttenderEmails,
  getEventAttendersRaw,
  getFullRegistrationsForExport,
  deleteAttenderRegistration,
} from "~/modules/events/data/attenders-repo.client";
import { getCSVHeaders, flattenCustomAnswers } from "~/modules/events/utils/custom-questions";
import type { CustomQuestionJson, CustomAnswerJson } from "~/modules/events/model/event.types";
import type { EventApprovalStatus, EventRegistration } from "~/shared/models/entity.types";

interface UseAttendersOptions {
  eventId: string;
  isExternalEvent?: boolean;
}

export function useAttenders({ eventId, isExternalEvent = false }: UseAttendersOptions) {
  const [data, setData] = useState<Attender[]>([]);
  const [loading, setLoading] = useState(true);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestionJson | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attenderToDelete, setAttenderToDelete] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const fetcher = useFetcher();

  const fetchAttenders = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    try {
      if (data.length === 0) setLoading(true);

      const customQs = await getAttendersCustomQuestions(eventId);
      if (customQs) setCustomQuestions(customQs);

      const { data: registrations, error } = await getEventAttendersRaw(eventId);
      if (error) {
        console.error("Error fetching registrations:", error);
        toast.error(isExternalEvent ? "Failed to load subscribers" : "Failed to load attenders");
        setData([]);
        setLoading(false);
        return;
      }

      const authenticatedUserIds = registrations
        .filter((reg: any) => reg.user_id)
        .map((reg: any) => reg.user_id);

      const userEmailsMap = await getAttenderEmails(eventId, authenticatedUserIds);

      const formattedData: Attender[] = registrations.map((reg: any) => {
        const isAnonymous = !reg.user_id;
        const phoneFromAnswers = (reg.custom_answers as CustomAnswerJson)?.phone;
        return {
          id: reg.id,
          name: isAnonymous
            ? reg.anonymous_name || "Anonymous"
            : reg.profiles?.full_name || "Unknown User",
          email: isAnonymous
            ? reg.anonymous_email
            : reg.user_id
              ? userEmailsMap.get(reg.user_id) || null
              : null,
          phone: phoneFromAnswers || reg.anonymous_phone,
          avatar_url: reg.profiles?.avatar_url,
          rsvp_status: reg.rsvp_status,
          approval_status: reg.approval_status || "approved",
          is_attended: reg.is_attended ?? false,
          registered_at: reg.registered_at,
          is_anonymous: isAnonymous,
          custom_answers: reg.custom_answers,
        };
      });

      setData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  }, [eventId, isExternalEvent]);

  useEffect(() => {
    fetchAttenders();
  }, [fetchAttenders]);

  const handleDeleteClick = (id: string, name: string) => {
    setAttenderToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!attenderToDelete) return;
    setIsDeleting(true);
    const { error } = await deleteAttenderRegistration(eventId, attenderToDelete.id);
    if (error) {
      console.error("Error deleting registration:", error);
      toast.error("Failed to remove attender");
      setIsDeleting(false);
      return;
    }
    toast.success(`${attenderToDelete.name} has been removed from the event`);
    setDeleteDialogOpen(false);
    setData((prev) => prev.filter((a) => a.id !== attenderToDelete.id));
    setAttenderToDelete(null);
    setIsDeleting(false);
  };

  const handleStatusUpdate = (id: string, status: "approved" | "rejected") => {
    const formData = new FormData();
    formData.append("registrationId", id);
    formData.append("eventId", eventId);
    formData.append("status", status);
    fetcher.submit(formData, {
      method: "POST",
      action: "/api/events/update-registration-status",
    });
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, approval_status: status } : item)),
    );
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if ((fetcher.data as any).success) {
        toast.success("Status updated successfully");
      } else if ((fetcher.data as any).error) {
        toast.error((fetcher.data as any).error);
        fetchAttenders();
      }
    }
  }, [fetcher.state, fetcher.data, fetchAttenders]);

  const handleExportToExcel = useCallback(async () => {
    const registrations = await getFullRegistrationsForExport(eventId);
    if (!registrations.length) return;

    const exportRows = data.map((row) => {
      const registration = registrations.find((r: any) => r.id === row.id);
      const baseData: Record<string, string> = {
        Name: row.name,
        Type: row.is_anonymous ? "Anonymous" : "Member",
        Email: row.email || "-",
        Phone: row.phone || "-",
        "RSVP Status": rsvpStatusConfig[row.rsvp_status]?.label || row.rsvp_status,
        "Approval Status": row.approval_status
          ? approvalStatusConfig[row.approval_status as EventApprovalStatus]?.label
          : "Approved",
        "Checked In": row.is_attended ? "Yes" : "No",
        "Registered At": row.registered_at
          ? new Date(row.registered_at).toLocaleString()
          : "-",
      };
      if (registration && customQuestions) {
        const flattened = flattenCustomAnswers(
          registration as EventRegistration,
          customQuestions,
        );
        Object.assign(baseData, flattened);
      }
      return baseData;
    });

    const ws = utils.json_to_sheet(exportRows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, isExternalEvent ? "Subscribers" : "Attenders");
    writeFile(wb, "event-attenders.xlsx");
  }, [data, eventId, customQuestions, isExternalEvent]);

  return {
    data,
    loading,
    customQuestions,
    deleteDialogOpen,
    setDeleteDialogOpen,
    attenderToDelete,
    isDeleting,
    handleDeleteClick,
    handleDeleteConfirm,
    handleStatusUpdate,
    handleExportToExcel,
  };
}
