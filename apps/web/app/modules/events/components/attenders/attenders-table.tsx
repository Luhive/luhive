import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  Row,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { z } from "zod";
import {
  IconChevronRight,
  IconTrash,
  IconMail,
  IconPhone,
  IconCheck,
  IconX,
  IconFilter,
} from "@tabler/icons-react";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import { Checkbox } from "~/shared/components/ui/checkbox";
import { Label } from "~/shared/components/ui/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/shared/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Filter, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/ui/avatar";
import { Separator } from "~/shared/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/shared/components/ui/drawer";
import { createClient } from "~/shared/lib/supabase/client";
import type { EventApprovalStatus, EventRegistration, RSVPStatus } from "~/shared/models/entity.types";
import { useEffect, useState } from "react";
import { AttendersTableSkeleton } from "~/modules/events/components/attenders/attenders-table-skeleton";
import { RegistrationAnswersDisplay } from "~/modules/events/components/registration/registration-answers-display";
import { utils, writeFile } from "xlsx";
import { useIsMobile } from "~/shared/hooks/use-mobile";
import { cn } from "~/shared/lib/utils";
import { useFetcher } from "react-router";
import type { CustomQuestionJson, CustomAnswerJson } from "~/modules/events/model/event.types";
import { getCSVHeaders, flattenCustomAnswers } from "~/modules/events/utils/custom-questions";

import ExcelIcon from "~/assets/images/ExcelLogo.png";

import type {
  EventInviteRegistrationType,
  InviteSuccessResult,
} from "~/modules/events/model/invite.types";

type InviteStatus = "self" | "pending_acceptance" | "accepted";

// Schema for attenders
export const attenderSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  avatar_url: z.string().nullable(),
  rsvp_status: z.enum(["going", "not_going", "maybe"]),
  approval_status: z
    .enum(["pending", "approved", "rejected"])
    .nullable()
    .optional(),
  is_attended: z.boolean(),
  registered_at: z.string().nullable(),
  is_anonymous: z.boolean(),
  custom_answers: z.any().nullable().optional(),
  registration_type: z.enum(["self", "invited"]).default("self"),
  is_verified: z.boolean(),
  invited_by_user_id: z.string().nullable(),
  invited_by_name: z.string().nullable(),
  invite_status: z.enum(["self", "pending_acceptance", "accepted"]),
  ticket_order_status: z
    .enum(["pending", "paid", "refunded"])
    .nullable()
    .optional(),
  ticket_payment_method: z.enum(["card_transfer", "cash"]).nullable().optional(),
  ticket_has_receipt: z.boolean().optional(),
});

type Attender = z.infer<typeof attenderSchema>;

const rsvpStatusConfig: Record<
  RSVPStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  going: { label: "Going", variant: "default" },
  not_going: { label: "Not Going", variant: "destructive" },
  maybe: { label: "Maybe", variant: "secondary" },
};

const approvalStatusConfig: Record<
  EventApprovalStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline" | "warning"; // Added warning conceptually
    className?: string;
  }
  > = {
  approved: { label: "Approved", variant: "default", className: "bg-green-500 hover:bg-green-600" },
  rejected: { label: "Rejected", variant: "destructive", className: "bg-red-400/50 hover:bg-red-400/60 text-red-800" },
  pending: { label: "Pending", variant: "secondary", className: "bg-amber-500 hover:bg-amber-600 text-white" },
};

function deriveInviteStatus(
  registrationType: EventInviteRegistrationType | string | null | undefined,
  isVerified: boolean | null | undefined,
): InviteStatus {
  if (registrationType !== "invited") {
    return "self";
  }
  return isVerified ? "accepted" : "pending_acceptance";
}

function getRegistrationSourceExportLabel(row: Attender): string {
  return row.registration_type === "invited" ? "Invited" : "Self";
}

function getInviteStatusExportLabel(row: Attender): string {
  if (row.invite_status === "self") return "-";
  if (row.invite_status === "pending_acceptance") return "Pending acceptance";
  return "Accepted";
}

function AttenderInviteDetails({ attender }: { attender: Attender }) {
  if (attender.invite_status === "self" || !attender.invited_by_name) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Invited By</span>
      <span className="text-sm font-medium">{attender.invited_by_name}</span>
    </div>
  );
}

function renderAttenderRsvpBadge(attender: Attender) {
  if (attender.invite_status === "pending_acceptance") {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-700 hover:bg-amber-100"
      >
        Invite Pending
      </Badge>
    );
  }

  const config = rsvpStatusConfig[attender.rsvp_status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function buildPendingInviteAttender(invite: InviteSuccessResult): Attender {
  return {
    id: invite.registrationId,
    name: invite.inviteeName,
    email: invite.inviteeEmail,
    phone: null,
    avatar_url: null,
    rsvp_status: "going",
    approval_status: null,
    is_attended: false,
    registered_at: new Date().toISOString(),
    is_anonymous: true,
    custom_answers: null,
    registration_type: "invited",
    is_verified: false,
    invited_by_user_id: invite.invitedByUserId,
    invited_by_name: invite.invitedByName,
    invite_status: "pending_acceptance",
    ticket_order_status: null,
    ticket_payment_method: null,
    ticket_has_receipt: false,
  };
}

function isUnpaidTicket(attender: Attender) {
  return attender.ticket_order_status === "pending";
}

function approvalBadgeLabel(attender: Attender): string {
  if (attender.invite_status === "pending_acceptance") return "Not accepted";
  if (attender.ticket_order_status === "refunded") return "Refunded";
  if (attender.ticket_order_status === "paid") return "Paid";
  if (attender.ticket_order_status === "pending" && attender.ticket_payment_method === "cash") {
    return "Pays at the door";
  }
  if (attender.ticket_order_status === "pending" && attender.ticket_has_receipt) {
    return "Receipt sent";
  }
  if (isUnpaidTicket(attender)) return "Unpaid";
  return (
    approvalStatusConfig[attender.approval_status as EventApprovalStatus]
      ?.label || "Approved"
  );
}

export type AttendersTableHandle = {
  applyInviteResult: (invite: InviteSuccessResult) => void;
};

interface AttendersTableProps {
  eventId: string;
  isExternalEvent?: boolean;
}

export const AttendersTable = React.forwardRef<
  AttendersTableHandle,
  AttendersTableProps
>(function AttendersTable({ eventId, isExternalEvent = false }, ref) {
  const [data, setData] = useState<Attender[]>([]);
  const [loading, setLoading] = useState(true);
  const [customQuestions, setCustomQuestions] =
    useState<CustomQuestionJson | null>(null);
  const [selectedAttender, setSelectedAttender] = useState<Attender | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [attenderToDelete, setAttenderToDelete] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const isMobile = useIsMobile();
  const fetcher = useFetcher();
  const ticketFetcher = useFetcher();

  // Fetch attenders client-side
  const fetchAttenders = React.useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      // Only set loading on initial fetch if data is empty
      if (data.length === 0) setLoading(true);

      const supabase = createClient();

      // Fetch event to get custom_questions
      const { data: eventData } = await supabase
        .from("events")
        .select("custom_questions")
        .eq("id", eventId)
        .single();

      if (eventData?.custom_questions) {
        setCustomQuestions(
          eventData.custom_questions as unknown as CustomQuestionJson,
        );
      }

      // Fetch event registrations with user profiles
      const { data: registrations, error } = await supabase
        .from("event_registrations")
        .select(
          `
          id,
          user_id,
          anonymous_name,
          anonymous_email,
          anonymous_phone,
          rsvp_status,
          approval_status,
          is_attended,
          registered_at,
          custom_answers,
          registration_type,
          is_verified,
          invited_by_user_id,
          profiles!event_registrations_user_id_fkey1 (
            id,
            full_name,
            avatar_url
          ),
          inviter:profiles!event_registrations_invited_by_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("event_id", eventId)
        .order("registered_at", { ascending: false });

      if (error) {
        console.error("Error fetching registrations:", error);
        toast.error(
          isExternalEvent
            ? "Failed to load subscribers"
            : "Failed to load attenders",
        );
        setData([]);
        setLoading(false);
        return;
      }

      // Get all unique user_ids from authenticated registrations
      const authenticatedUserIds = (registrations || [])
        .filter((reg: any) => reg.user_id)
        .map((reg: any) => reg.user_id);

      // Fetch emails for authenticated users from API route
      const orderByRegistration = new Map<
        string,
        {
          status: "pending" | "paid" | "refunded";
          paymentMethod: "card_transfer" | "cash" | null;
          hasReceipt: boolean;
        }
      >();
      try {
        const ordersResponse = await fetch(
          `/api/events/ticket-orders?eventId=${encodeURIComponent(eventId)}`,
        );
        if (ordersResponse.ok) {
          const body = await ordersResponse.json();
          for (const order of body.orders ?? []) {
            orderByRegistration.set(order.registrationId, {
              status: order.status,
              paymentMethod: order.paymentMethod ?? null,
              hasReceipt: order.hasReceipt === true,
            });
          }
        }
      } catch (ordersError) {
        console.error("Failed to load ticket orders", ordersError);
      }

      const userEmailsMap = new Map<string, string>();
      if (authenticatedUserIds.length > 0) {
        try {
          const response = await fetch(
            `/api/events/attenders-emails?userIds=${encodeURIComponent(JSON.stringify(authenticatedUserIds))}`,
          );
          if (response.ok) {
            const { emails } = await response.json();
            // emails is an object: { userId: "email" }
            Object.entries(emails || {}).forEach(([userId, email]) => {
              userEmailsMap.set(userId, email as string);
            });
          }
        } catch (e) {
          console.error("Failed to fetch emails", e);
        }
      }

      const formattedData: Attender[] = (registrations || []).map(
        (reg: any) => {
          const isAnonymous = !reg.user_id;
          const registrationType = (reg.registration_type ||
            "self") as EventInviteRegistrationType;
          const isVerified = reg.is_verified ?? false;
          const inviteStatus = deriveInviteStatus(registrationType, isVerified);
          const inviterProfile = Array.isArray(reg.inviter)
            ? reg.inviter[0]
            : reg.inviter;
          const attendeeProfile = Array.isArray(reg.profiles)
            ? reg.profiles[0]
            : reg.profiles;
          const phoneFromAnswers = (reg.custom_answers as CustomAnswerJson)
            ?.phone;

          return {
            id: reg.id,
            name: isAnonymous
              ? reg.anonymous_name || "Anonymous"
              : attendeeProfile?.full_name || "Unknown User",
            email: isAnonymous
              ? reg.anonymous_email
              : reg.user_id
                ? (userEmailsMap.get(reg.user_id) ?? null)
                : null,
            phone: phoneFromAnswers || reg.anonymous_phone,
            avatar_url: attendeeProfile?.avatar_url ?? null,
            rsvp_status: reg.rsvp_status,
            approval_status:
              inviteStatus === "pending_acceptance"
                ? reg.approval_status
                : reg.approval_status || "approved",
            is_attended: reg.is_attended ?? false,
            registered_at: reg.registered_at,
            is_anonymous: isAnonymous,
            custom_answers: reg.custom_answers,
            registration_type: registrationType,
            is_verified: isVerified,
            invited_by_user_id: reg.invited_by_user_id ?? null,
            invited_by_name: inviterProfile?.full_name ?? null,
            invite_status: inviteStatus,
            ticket_order_status: orderByRegistration.get(reg.id)?.status ?? null,
            ticket_payment_method:
              orderByRegistration.get(reg.id)?.paymentMethod ?? null,
            ticket_has_receipt: orderByRegistration.get(reg.id)?.hasReceipt ?? false,
          };
        },
      );

      setData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  }, [eventId]); // Removed data dependency to avoid loop, managed by useEffect

  useEffect(() => {
    fetchAttenders();
  }, [fetchAttenders]);

  React.useImperativeHandle(
    ref,
    () => ({
      applyInviteResult: (invite: InviteSuccessResult) => {
        const normalizedEmail = invite.inviteeEmail.toLowerCase();
        const pendingRow = buildPendingInviteAttender(invite);

        setData((prev) => {
          const withoutDuplicate = prev.filter(
            (row) => row.email?.toLowerCase() !== normalizedEmail,
          );
          return [pendingRow, ...withoutDuplicate];
        });
      },
    }),
    [],
  );

  const handleDeleteClick = (id: string, name: string) => {
    setAttenderToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleShowAttenderDetails = (attender: Attender) => {
    setSelectedAttender(attender);
    setDrawerOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!attenderToDelete) return;

    setIsDeleting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("id", attenderToDelete.id)
        .eq("event_id", eventId);

      if (error) {
        console.error("Error deleting registration:", error);
        toast.error("Failed to remove attender");
        setIsDeleting(false);
        return;
      }

      toast.success(`${attenderToDelete.name} has been removed from the event`);
      setDeleteDialogOpen(false);
      setAttenderToDelete(null);
      setIsDeleting(false);
      // Remove from local state
      setData((prev) => prev.filter((a) => a.id !== attenderToDelete.id));
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to remove attender");
      setIsDeleting(false);
    }
  };

  const handleStatusUpdate = async (
    id: string,
    status: "approved" | "rejected",
  ) => {
    const formData = new FormData();
    formData.append("registrationId", id);
    formData.append("eventId", eventId);
    formData.append("status", status);

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/events/update-registration-status",
    });

    // Optimistic update
    setData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, approval_status: status } : item,
      ),
    );

    // toast.info(`Updating status to ${status}...`);
  };

  const handleTicketAction = (id: string, intent: "mark-paid" | "resend" | "refund") => {
    if (
      intent === "refund" &&
      !window.confirm(
        "Refund this ticket? They lose their spot. You return the money yourself.",
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.append("registrationId", id);
    formData.append("eventId", eventId);
    formData.append("intent", intent);
    ticketFetcher.submit(formData, {
      method: "POST",
      action: "/api/events/ticket-orders",
    });
    if (intent === "mark-paid" || intent === "refund") {
      setData((prev) =>
        prev.map((item) =>
          item.id === id
            ? intent === "mark-paid"
              ? {
                  ...item,
                  approval_status: "approved",
                  ticket_order_status: "paid",
                }
              : {
                  ...item,
                  approval_status: "rejected",
                  ticket_order_status: "refunded",
                }
            : item,
        ),
      );
    }
  };

  useEffect(() => {
    if (ticketFetcher.state === "idle" && ticketFetcher.data) {
      if (ticketFetcher.data.success) {
        toast.success(ticketFetcher.data.message ?? "Saved");
      } else if (ticketFetcher.data.error) {
        toast.error(ticketFetcher.data.error);
        fetchAttenders();
      }
    }
  }, [ticketFetcher.state, ticketFetcher.data, fetchAttenders]);

  // Monitor fetcher response
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        toast.success("Status updated successfully");
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error);
        // Revert on error? For now, we can just reload
        fetchAttenders();
      }
    }
  }, [fetcher.state, fetcher.data, fetchAttenders]);

  const handleExportToExcel = React.useCallback(async () => {
    const supabase = createClient();

    // Fetch full registration data for export
    const { data: registrations } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId);

    if (!registrations) return;

    // Get custom question headers
    const customHeaders = customQuestions ? getCSVHeaders(customQuestions) : [];

    const exportData = data.map((row) => {
      const registration = registrations.find((r: any) => r.id === row.id);
      const baseData: Record<string, string> = {
        Name: row.name,
        Type: row.is_anonymous ? "Anonymous" : "Member",
        Email: row.email || "-",
        Phone: row.phone || "-",
        "Registration Source": getRegistrationSourceExportLabel(row),
        "Invite Status": getInviteStatusExportLabel(row),
        "Invited By": row.invited_by_name || "-",
        "RSVP Status":
          rsvpStatusConfig[row.rsvp_status]?.label || row.rsvp_status,
        "Approval Status": approvalBadgeLabel(row),
        "Checked In": row.is_attended ? "Yes" : "No",
        "Registered At": row.registered_at
          ? new Date(row.registered_at).toLocaleString()
          : "-",
      };

      // Add custom question answers if available
      if (registration && customQuestions) {
        const flattened = flattenCustomAnswers(
          registration as EventRegistration,
          customQuestions,
        );
        Object.assign(baseData, flattened);
      }

      return baseData;
    });

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(
      wb,
      ws,
      isExternalEvent ? "Subscribers" : "Attenders",
    );
    writeFile(wb, "event-attenders.xlsx");
  }, [data, eventId, customQuestions]);

  const columns = React.useMemo<ColumnDef<Attender>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: isExternalEvent ? "Subscriber" : "Attender",
        cell: ({ row }) => (
          <button
            onClick={() => handleShowAttenderDetails(row.original)}
            className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={row.original.avatar_url || ""}
                alt={row.original.name}
              />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {row.original.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="font-medium">{row.original.name}</div>
              {row.original.registration_type === "invited" && (
                <span className="text-xs text-muted-foreground">
                  Invited by {row.original.invited_by_name || "Unknown"}
                </span>
              )}
              {row.original.is_anonymous &&
                row.original.invite_status === "self" && (
                  <span className="text-xs text-muted-foreground">
                    Anonymous
                  </span>
                )}
            </div>
          </button>
        ),
      },
      {
        accessorKey: "email",
        header: "Contact",
        cell: ({ row }) => (
          <div className="space-y-1">
            {row.original.email && (
              <div className="flex items-center gap-2 text-sm">
                <IconMail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {row.original.email}
                </span>
              </div>
            )}
            {row.original.phone && (
              <div className="flex items-center gap-2 text-sm">
                <IconPhone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {row.original.phone}
                </span>
              </div>
            )}
            {!row.original.email && !row.original.phone && (
              <span className="text-sm text-muted-foreground">
                No contact info
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "approval_status",
        header: "Approved",
        cell: ({ row }) => {
          if (row.original.invite_status === "pending_acceptance") {
            return (
              <Badge variant="outline" className="text-muted-foreground">
                Not accepted
              </Badge>
            );
          }

          const status = (row.original.approval_status ||
            "approved") as EventApprovalStatus;
          const config = approvalStatusConfig[status];
          return (
            <Badge
              variant="outline"
              className={cn(
                "border-transparent font-medium",
                config?.className,
                status === "approved" &&
                  "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
                row.original.ticket_order_status === "refunded" &&
                  "bg-muted text-muted-foreground hover:bg-muted",
              )}
            >
              {approvalBadgeLabel(row.original)}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "rsvp_status",
        header: "RSVP",
        cell: ({ row }) => renderAttenderRsvpBadge(row.original),
      },
      {
        accessorKey: "is_attended",
        header: "Checked In",
        cell: ({ row }) => (
          <Badge variant={row.original.is_attended ? "default" : "outline"}>
            {row.original.is_attended ? "Checked in" : "Not checked in"}
          </Badge>
        ),
      },
      {
        accessorKey: "registered_at",
        header: isExternalEvent ? "Subscribed" : "Registered",
        cell: ({ row }) => {
          if (!row.original.registered_at)
            return <span className="text-muted-foreground">-</span>;
          const date = new Date(row.original.registered_at);
          return (
            <div className="text-muted-foreground text-sm">
              {date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const attender = row.original;
          const isUnpaid = isUnpaidTicket(attender);
          const isPending =
            attender.approval_status === "pending" &&
            attender.invite_status !== "pending_acceptance" &&
            !isUnpaid;
          const isPendingInvite =
            attender.invite_status === "pending_acceptance";

          return (
            <div className="flex items-center gap-2">
              {isUnpaid && attender.ticket_has_receipt && (
                <Button size="sm" variant="outline" className="h-8" asChild>
                  <a
                    href={`/api/events/ticket-receipt?registrationId=${encodeURIComponent(attender.id)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View receipt
                  </a>
                </Button>
              )}
              {isUnpaid && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={ticketFetcher.state !== "idle"}
                  onClick={() => handleTicketAction(attender.id, "mark-paid")}
                >
                  Mark as paid
                </Button>
              )}
              {isPending && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => handleStatusUpdate(attender.id, "approved")}
                    title="Approve"
                  >
                    <IconCheck className="h-4 w-4" />
                    <span className="sr-only">Approve</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleStatusUpdate(attender.id, "rejected")}
                    title="Reject"
                  >
                    <IconX className="h-4 w-4" />
                    <span className="sr-only">Reject</span>
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    onClick={() => navigator.clipboard.writeText(attender.id)}
                  >
                    Copy ID
                  </DropdownMenuCheckboxItem>
                  {attender.email && (
                    <DropdownMenuCheckboxItem
                      onClick={() =>
                        (window.location.href = `mailto:${attender.email}`)
                      }
                    >
                      Email Attender
                    </DropdownMenuCheckboxItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    onClick={() => handleShowAttenderDetails(attender)}
                  >
                    Show Answers
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {attender.ticket_order_status === "paid" && (
                    <>
                      <DropdownMenuCheckboxItem
                        onClick={() => handleTicketAction(attender.id, "resend")}
                      >
                        Resend confirmation
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleTicketAction(attender.id, "refund")}
                      >
                        Refund
                      </DropdownMenuCheckboxItem>
                    </>
                  )}
                  {!isPendingInvite &&
                    !isUnpaid &&
                    !isPending &&
                    attender.ticket_order_status !== "refunded" &&
                    attender.approval_status !== "approved" && (
                      <DropdownMenuCheckboxItem
                        onClick={() =>
                          handleStatusUpdate(attender.id, "approved")
                        }
                        className="text-green-600"
                      >
                        Approve Registration
                      </DropdownMenuCheckboxItem>
                    )}
                  {!isPendingInvite &&
                    !isPending &&
                    attender.approval_status !== "rejected" && (
                      <DropdownMenuCheckboxItem
                        onClick={() =>
                          handleStatusUpdate(attender.id, "rejected")
                        }
                        className="text-red-600"
                      >
                        Reject Registration
                      </DropdownMenuCheckboxItem>
                    )}
                  <DropdownMenuCheckboxItem
                    className="text-destructive focus:text-destructive"
                    onClick={() =>
                      handleDeleteClick(attender.id, attender.name)
                    }
                  >
                    <IconTrash className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleDeleteClick, handleTicketAction, ticketFetcher.state],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return <AttendersTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Search & Filters */}
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <InputGroup className="w-full sm:w-[300px]">
            <InputGroupAddon>
              <Search className="h-4 w-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={
                isExternalEvent
                  ? "Filter subscribers..."
                  : "Filter attenders..."
              }
              value={
                (table.getColumn("name")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
              }
            />
          </InputGroup>

          {/* Status Filter */}
          <Select
            value={
              (
                table.getColumn("approval_status")?.getFilterValue() as string[]
              )?.[0] || "all"
            }
            onValueChange={(value) => {
              if (value === "all") {
                table.getColumn("approval_status")?.setFilterValue(undefined);
              } else {
                table.getColumn("approval_status")?.setFilterValue([value]);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-2">
                <IconFilter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto sm:ml-0">
                Columns <IconChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.replace("_", " ")}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          {Object.keys(rowSelection).length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                // Bulk delete not implemented yet
                toast.info("Bulk actions coming soon");
              }}
            >
              Delete Selected ({Object.keys(rowSelection).length})
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleExportToExcel}>
            <img src={ExcelIcon} alt="Excel" className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Attender
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">
                {attenderToDelete?.name}
              </span>{" "}
              from the event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attender Details Drawer/Dialog */}
      {selectedAttender &&
        (isMobile ? (
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="flex flex-col overflow-hidden">
              <DrawerHeader>
                <DrawerTitle>{selectedAttender.name}</DrawerTitle>
                <DrawerDescription>
                  Complete registration details
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={selectedAttender.avatar_url || ""}
                        alt={selectedAttender.name}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedAttender.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {selectedAttender.name}
                      </div>
                      {selectedAttender.invite_status ===
                        "pending_acceptance" && (
                        <Badge variant="secondary" className="mt-1">
                          Pending invite
                        </Badge>
                      )}
                      {selectedAttender.invite_status === "accepted" && (
                        <Badge variant="outline" className="mt-1">
                          Invited
                        </Badge>
                      )}
                      {selectedAttender.is_anonymous &&
                        selectedAttender.invite_status === "self" && (
                          <Badge variant="secondary" className="mt-1">
                            Anonymous
                          </Badge>
                        )}
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Email
                      </span>
                      <span className="text-sm font-medium">
                        {selectedAttender.email || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Phone
                      </span>
                      <span className="text-sm font-medium">
                        {selectedAttender.phone || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        RSVP Status
                      </span>
                      {renderAttenderRsvpBadge(selectedAttender)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Approval Status
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent font-medium",
                          approvalStatusConfig[
                            selectedAttender.approval_status as EventApprovalStatus
                          ]?.className,
                          selectedAttender.approval_status === "approved" &&
                            "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
                        )}
                      >
                        {approvalBadgeLabel(selectedAttender)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Checked In
                      </span>
                      <Badge
                        variant={
                          selectedAttender.is_attended ? "default" : "outline"
                        }
                      >
                        {selectedAttender.is_attended
                          ? "Checked in"
                          : "Not checked in"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Registered At
                      </span>
                      <span className="text-sm font-medium">
                        {selectedAttender.registered_at
                          ? new Date(
                              selectedAttender.registered_at,
                            ).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                    <AttenderInviteDetails attender={selectedAttender} />
                  </div>
                </div>

                {/* Custom Answers */}
                {customQuestions && selectedAttender.custom_answers && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">Custom Answers</h3>
                      <RegistrationAnswersDisplay
                        answers={
                          selectedAttender.custom_answers as CustomAnswerJson | null
                        }
                        questions={customQuestions}
                      />
                    </div>
                  </>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedAttender.name}</DialogTitle>
                <DialogDescription>
                  Complete registration details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={selectedAttender.avatar_url || ""}
                        alt={selectedAttender.name}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedAttender.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {selectedAttender.name}
                      </div>
                      {selectedAttender.invite_status ===
                        "pending_acceptance" && (
                        <Badge variant="secondary" className="mt-1">
                          Pending invite
                        </Badge>
                      )}
                      {selectedAttender.invite_status === "accepted" && (
                        <Badge variant="outline" className="mt-1">
                          Invited
                        </Badge>
                      )}
                      {selectedAttender.is_anonymous &&
                        selectedAttender.invite_status === "self" && (
                          <Badge variant="secondary" className="mt-1">
                            Anonymous
                          </Badge>
                        )}
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Email
                      </span>
                      <span className="text-sm font-medium">
                        {selectedAttender.email || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Phone
                      </span>
                      <span className="text-sm font-medium">
                        {selectedAttender.phone || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        RSVP Status
                      </span>
                      {renderAttenderRsvpBadge(selectedAttender)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Approval Status
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent font-medium",
                          approvalStatusConfig[
                            selectedAttender.approval_status as EventApprovalStatus
                          ]?.className,
                          selectedAttender.approval_status === "approved" &&
                            "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
                        )}
                      >
                        {approvalBadgeLabel(selectedAttender)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Checked In
                      </span>
                      <Badge
                        variant={
                          selectedAttender.is_attended ? "default" : "outline"
                        }
                      >
                        {selectedAttender.is_attended
                          ? "Checked in"
                          : "Not checked in"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Registered At
                      </span>
                      <span className="text-sm font-medium">
                        {selectedAttender.registered_at
                          ? new Date(
                              selectedAttender.registered_at,
                            ).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                    <AttenderInviteDetails attender={selectedAttender} />
                  </div>
                </div>

                {/* Custom Answers */}
                {customQuestions && selectedAttender.custom_answers && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">Custom Answers</h3>
                      <RegistrationAnswersDisplay
                        answers={
                          selectedAttender.custom_answers as CustomAnswerJson | null
                        }
                        questions={customQuestions}
                      />
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        ))}
    </div>
  );
});
