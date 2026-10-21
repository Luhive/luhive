import { useRef, useState, useEffect } from 'react';
import { useNavigate, useFetcher } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/card';
import { Button } from '~/shared/components/ui/button';
import { Separator } from '~/shared/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/shared/components/ui/accordion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/shared/components/ui/sheet';
import { Routes } from '~/shared/lib/routing/routes';
import { Spinner } from '~/shared/components/ui/spinner';
import { Save, FileText, Calendar, MapPin, Users, Eye, MessageCircle, HelpCircle, Users2, Bell, Sparkles, Ticket } from 'lucide-react';
import {
  formatMoney,
  isValidTicketPriceMinor,
  minorToMajorUnits,
  parsePriceInputToMinor,
} from '@luhive/domain/v1/money';
import * as CommunitySettings from '@luhive/domain/v1/community-settings';
import { EventPrice } from '~/modules/events/components/event-form/fields/event-price';
import { EventPaymentInstructions } from '~/modules/events/components/event-form/fields/event-payment-instructions';
import { EventCoverUpload } from '~/modules/events/components/event-form/event-cover-upload';
import { EventBasicInfo } from '~/modules/events/components/event-form/fields/event-basic-info';
import { EventDateTime } from '~/modules/events/components/event-form/fields/event-datetime';
import { EventLocation } from '~/modules/events/components/event-form/fields/event-location';
import { EventCapacity } from '~/modules/events/components/event-form/fields/event-capacity';
import { EventDiscussion } from '~/modules/events/components/event-form/fields/event-discussion';
import { EventReminderTimes, EventReminderEmailCustomization, type ReminderTime } from '~/modules/events/components/event-form/fields/event-reminders';
import { CustomQuestionsBuilder } from '~/modules/events/components/registration/custom-questions-builder';
import { CollaborationInviteDialog } from '~/modules/events/components/collaboration/collaboration-invite-dialog';
import { CollaborationList } from '~/modules/events/components/collaboration/collaboration-list';
import type { CollaborationWithCommunity } from '~/modules/events/components/collaboration/collaboration-list';
import { createClient } from '~/shared/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '~/shared/models/database.types';
import type { EventCreateResult, EventCreateError } from '~/modules/events/server/event-create-action.server';
import type { EventUpdateResult, EventUpdateError } from '~/modules/events/server/event-update-action.server';
import type { CustomQuestionJson } from '~/modules/events/model/event.types';
import type { LocationValue } from '~/modules/events/model/event-location.types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

type EventType = Database['public']['Enums']['event_type'];
type EventStatus = Database['public']['Enums']['event_status'];

interface EventFormData {
  title: string;
  description: string;
  startDate?: Date;
  startTime: string;
  endTime?: string;
  timezone: string;
  eventType: EventType;
  /** Structured Google Places location (preferred) */
  location?: LocationValue | null;
  /** Legacy plain-text address for events without a place_id */
  locationAddress?: string;
  onlineMeetingLink?: string;
  discussionLink?: string;
  capacity?: number;
  registrationDeadline?: Date;
  coverUrl?: string;
  status: EventStatus;
  isApproveRequired: boolean;
  priceMinor?: number | null;
  paymentInstructions?: string | null;
  customQuestions?: CustomQuestionJson | null;
  reminderTimes?: ReminderTime[];
  reminderMessage?: string | null;
}

interface EventFormProps {
  communitySlug: string;
  communityId: string;
  eventId?: string;
  eventSlug?: string;
  mode: 'create' | 'edit';
  initialData?: Partial<EventFormData>;
  isPaidTicketingEnabled?: boolean;
  paymentProvider?: CommunitySettings.PaymentProvider;
}

const TICKET_CURRENCY = 'AZN';

export function EventForm({
  communitySlug,
  communityId,
  eventId,
  eventSlug,
  mode,
  initialData,
  isPaidTicketingEnabled = false,
  paymentProvider = CommunitySettings.PaymentProvider.Manual,
}: EventFormProps) {
  const navigate = useNavigate();
  const initialRef = useRef<Partial<EventFormData> | undefined>(initialData);
  const createFetcher = useFetcher<EventCreateResult | EventCreateError>();
  const updateFetcher = useFetcher<EventUpdateResult | EventUpdateError>();
  const submitIsDraftRef = useRef(false);
  const pendingInvitesRef = useRef<{ id: string; name: string; slug: string; logo_url?: string | null }[]>([]);

  // For create mode the loading state comes from the fetcher; edit mirrors it
  const isBusy = mode === 'create' ? createFetcher.state !== 'idle' : updateFetcher.state !== 'idle';

  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [startDate, setStartDate] = useState<Date | undefined>(initialData?.startDate);
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '10:00');
  const [timezone, setTimezone] = useState(initialData?.timezone || 'Asia/Baku');
  const [eventType, setEventType] = useState<EventType>(initialData?.eventType || 'in-person');
  const [location, setLocation] = useState<LocationValue | null>(initialData?.location ?? null);
  const [onlineMeetingLink, setOnlineMeetingLink] = useState(initialData?.onlineMeetingLink || '');
  const [discussionLink, setDiscussionLink] = useState(initialData?.discussionLink || '');
  const [capacity, setCapacity] = useState<number | undefined>(initialData?.capacity);
  const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(
    initialData?.registrationDeadline
  );
  const [coverUrl, setCoverUrl] = useState(initialData?.coverUrl || '');
  const [status, setStatus] = useState<EventStatus>(initialData?.status || 'draft');
  const [isApproveRequired, setIsApproveRequired] = useState(initialData?.isApproveRequired || false);
  const [priceInput, setPriceInput] = useState(
    initialData?.priceMinor != null
      ? minorToMajorUnits(initialData.priceMinor).toFixed(2)
      : ''
  );
  const [paymentInstructions, setPaymentInstructions] = useState(
    initialData?.paymentInstructions ?? ''
  );
  const [customQuestions, setCustomQuestions] = useState<CustomQuestionJson | null>(
    initialData?.customQuestions || null
  );
  const [reminderTimes, setReminderTimes] = useState<ReminderTime[]>(initialData?.reminderTimes || []);
  const [reminderMessage, setReminderMessage] = useState<string | null>(initialData?.reminderMessage || null);

  // Preview sheet
  const [showPreview, setShowPreview] = useState(false);

  // Collaboration state
  const [collaborations, setCollaborations] = useState<CollaborationWithCommunity[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [loadingCollaborations, setLoadingCollaborations] = useState(false);
  // Pending invites when creating an event (collected before event exists)
  const [pendingInvites, setPendingInvites] = useState<{
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
  }[]>([]);

  const trimmedPriceInput = priceInput.trim();
  const parsedPriceMinor = trimmedPriceInput
    ? parsePriceInputToMinor(trimmedPriceInput)
    : null;
  const priceError =
    trimmedPriceInput &&
    (parsedPriceMinor === null || !isValidTicketPriceMinor(parsedPriceMinor))
      ? 'Enter a price such as 25 or 12.50'
      : null;
  const priceMinor = priceError ? null : parsedPriceMinor;
  const showPriceCard = isPaidTicketingEnabled || initialData?.priceMinor != null;
  const needsPaymentInstructions =
    priceMinor !== null &&
    paymentProvider === CommunitySettings.PaymentProvider.Manual;
  const submittedPaymentInstructions = needsPaymentInstructions
    ? paymentInstructions.trim()
    : null;

  // Validation
  const isValid = () => {
    if (!title.trim()) return false;
    if (priceError) return false;
    if (needsPaymentInstructions && !paymentInstructions.trim()) return false;
    if (!startDate) return false;
    if (!startTime) return false;
    
    // Check event type specific validations
    const hasPhysicalLocation = !!location || !!initialData?.locationAddress;
    if (eventType === 'in-person' && !hasPhysicalLocation) return false;
    if (eventType === 'online' && !onlineMeetingLink.trim()) return false;
    if (eventType === 'hybrid' && (!hasPhysicalLocation || !onlineMeetingLink.trim())) return false;
    
    // Validate discussion link if provided (must be valid URL)
    if (discussionLink.trim()) {
      try {
        new URL(discussionLink.trim());
      } catch {
        return false;
      }
    }

    return true;
  };

  // Load collaborations when in edit mode
  useEffect(() => {
    if (mode === 'edit' && eventId) {
      const currentEventId = eventId;
      async function loadCollaborations() {
        setLoadingCollaborations(true);
        const supabase = createClient();
        
        try {
          // Check if this community is host
          const { data: hostCollab } = await supabase
            .from('event_collaborations')
            .select('role')
            .eq('event_id', currentEventId)
            .eq('community_id', communityId)
            .eq('role', 'host')
            .eq('status', 'accepted')
            .single();
          
          setIsHost(!!hostCollab);
          
          // Load all collaborations
          const { data: collabs, error } = await supabase
            .from('event_collaborations')
            .select(`
              *,
              community:communities!event_collaborations_community_id_fkey (
                id,
                name,
                slug,
                logo_url
              )
            `)
            .eq('event_id', currentEventId)
            .order('created_at', { ascending: true });
          
          if (error) {
            console.error('Error loading collaborations:', error);
          } else if (collabs) {
            const formatted = collabs.map((c: any) => ({
              id: c.id,
              role: c.role as 'host' | 'co-host',
              status: c.status as 'pending' | 'accepted' | 'rejected',
              invited_at: c.invited_at,
              accepted_at: c.accepted_at,
              community: Array.isArray(c.community) ? c.community[0] : c.community,
            })) as CollaborationWithCommunity[];
            setCollaborations(formatted);
          }
        } catch (error) {
          console.error('Error loading collaborations:', error);
        } finally {
          setLoadingCollaborations(false);
        }
      }
      loadCollaborations();
    }
  }, [mode, eventId, communityId]);

  // Keep ref in sync so the fetcher effect always sees the latest pendingInvites
  useEffect(() => {
    pendingInvitesRef.current = pendingInvites;
  }, [pendingInvites]);

  // Handle server action response for event creation
  useEffect(() => {
    if (createFetcher.state !== 'idle' || !createFetcher.data) return;

    const data = createFetcher.data;

    if (!data.success) {
      toast.error((data as EventCreateError).error || 'Failed to create event');
      return;
    }

    const { eventId: newEventId, eventSlug: newEventSlug, communitySlug: slug } = data as EventCreateResult;
    const currentInvites = pendingInvitesRef.current;
    const isDraft = submitIsDraftRef.current;

    async function finishCreate() {
      if (currentInvites.length > 0) {
        try {
          for (const p of currentInvites) {
            try {
              const form = new FormData();
              form.append('intent', 'invite-collaboration');
              form.append('coHostCommunityId', p.id);

              const res = await fetch(Routes.community.eventCollaboration(slug, newEventSlug), {
                method: 'POST',
                body: form,
                credentials: 'same-origin',
              });

              if (!res.ok) {
                const body = await res.text();
                console.error('Failed to send pending invite via action:', res.status, body);
              } else {
                const json = await res.json().catch(() => null);
                if (!json || !json.success) {
                  console.error('Invite action returned error for', p.id, json);
                }
              }
            } catch (err) {
              console.error('Error sending invite for pending community', p.id, err);
            }
          }
          toast.success(`Sent ${currentInvites.length} collaboration invite(s)`);
        } catch (inviteErr) {
          console.error('Error sending pending invites:', inviteErr);
        } finally {
          setPendingInvites([]);
        }
      }

      toast.success(`Event ${isDraft ? 'saved as draft' : 'published'} successfully!`);
      navigate(`/dashboard/${slug}/events`);
    }

    finishCreate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createFetcher.state, createFetcher.data]);

  // Handle server action response for event update
  useEffect(() => {
    if (updateFetcher.state !== 'idle' || !updateFetcher.data) return;

    const data = updateFetcher.data;

    if (!data.success) {
      toast.error((data as EventUpdateError).error || 'Failed to update event');
      return;
    }

    const { eventId: updatedEventId, communitySlug: slug, status: updatedStatus } = data as EventUpdateResult;

    async function finishUpdate() {
      if (updatedStatus === 'published' && hasOnlyScheduleOrLocationChanges()) {
        try {
          await fetch('/api/events/schedule-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: updatedEventId }),
          });
        } catch (notifyError) {
          console.error('Failed to trigger schedule update emails:', notifyError);
        }
      }

      toast.success('Event updated successfully!');
      navigate(`/dashboard/${slug}/events`);
    }

    finishUpdate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateFetcher.state, updateFetcher.data]);

  const hasOnlyScheduleOrLocationChanges = () => {
    if (!initialRef.current || mode !== 'edit') {
      return false;
    }

    const initial = initialRef.current;

    // Helper to compare dates by day
    const sameDate = (a?: Date, b?: Date) => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      return dayjs(a).isSame(dayjs(b), 'day');
    };

    const sameOrDefault = (a: string | undefined, b: string | undefined, fallback: string) =>
      (a || fallback) === (b || fallback);

    // 1) Check if any non schedule/location fields changed
    const nonScheduleChanged =
      (initial.title || '') !== title ||
      (initial.description || '') !== description ||
      (initial.eventType || 'in-person') !== eventType ||
      (initial.discussionLink || '') !== discussionLink ||
      (initial.coverUrl || '') !== coverUrl ||
      (initial.timezone || 'Asia/Baku') !== timezone ||
      (initial.capacity || undefined) !== capacity ||
      (!!initial.registrationDeadline) !== (!!registrationDeadline) ||
      (initial.registrationDeadline &&
        registrationDeadline &&
        !sameDate(initial.registrationDeadline, registrationDeadline)) ||
      (initial.isApproveRequired || false) !== isApproveRequired ||
      (initial.priceMinor ?? null) !== priceMinor ||
      (initial.paymentInstructions ?? '') !== paymentInstructions ||
      JSON.stringify(initial.customQuestions ?? null) !==
        JSON.stringify(customQuestions ?? null);

    if (nonScheduleChanged) {
      return false;
    }

    // 2) Check if at least one schedule/location field changed
    const scheduleChanged =
      !sameDate(initial.startDate, startDate) ||
      !sameOrDefault(initial.startTime, startTime, '09:00') ||
      !sameOrDefault(initial.endTime, endTime, '10:00') ||
      (initial.location?.placeId ?? initial.locationAddress ?? '') !==
        (location?.placeId ?? initial.locationAddress ?? '') ||
      (initial.onlineMeetingLink || '') !== onlineMeetingLink;

    return scheduleChanged;
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isValid()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (mode === 'create') {
      const submitStatus: EventStatus = isDraft ? 'draft' : 'published';

      const startDateTime = dayjs.tz(
        `${dayjs(startDate).format('YYYY-MM-DD')}T${startTime}`,
        timezone
      ).toISOString();

      const endDateTime = endTime
        ? dayjs.tz(
            `${dayjs(startDate).format('YYYY-MM-DD')}T${endTime}`,
            timezone
          ).toISOString()
        : null;

      const eventStartDateTime = dayjs.tz(
        `${dayjs(startDate).format('YYYY-MM-DD')}T${startTime}`,
        timezone
      );

      submitIsDraftRef.current = isDraft;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createFetcher.submit(
        {
          communityId,
          communitySlug,
          title,
          description: description || null,
          startTime: startDateTime,
          endTime: endDateTime,
          timezone,
          eventType,
          locationAddress: location?.address || null,
          locationName: location?.name || null,
          locationLat: location?.lat ?? null,
          locationLng: location?.lng ?? null,
          locationPlaceId: location?.placeId || null,
          onlineMeetingLink: onlineMeetingLink || null,
          discussionLink: discussionLink.trim() || null,
          capacity: capacity || null,
          registrationDeadline: registrationDeadline ? registrationDeadline.toISOString() : null,
          coverUrl: coverUrl || null,
          status: submitStatus,
          isApproveRequired,
          priceMinor,
          paymentInstructions: submittedPaymentInstructions,
          customQuestions: customQuestions ?? null,
          reminderTimes,
          reminderMessage: reminderMessage || null,
          eventDate: eventStartDateTime.format('dddd, MMMM D, YYYY'),
          eventTime: eventStartDateTime.format('h:mm A z'),
          eventLinkBase: window.location.origin,
        } as any,
        { method: 'POST', encType: 'application/json', action: '/api/events/create' }
      );

      // Navigation and toasts are handled in the createFetcher useEffect
      return;
    } else if (mode === 'edit' && eventId) {
      const submitStatus: EventStatus = isDraft ? 'draft' : 'published';

      const startDateTime = dayjs.tz(
        `${dayjs(startDate).format('YYYY-MM-DD')}T${startTime}`,
        timezone
      ).toISOString();

      const endDateTime = endTime
        ? dayjs.tz(
            `${dayjs(startDate).format('YYYY-MM-DD')}T${endTime}`,
            timezone
          ).toISOString()
        : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateFetcher.submit(
        {
          eventId,
          communityId,
          communitySlug,
          title,
          description: description || null,
          startTime: startDateTime,
          endTime: endDateTime,
          timezone,
          eventType,
          locationAddress: location?.address || initialData?.locationAddress || null,
          locationName: location?.name || null,
          locationLat: location?.lat ?? null,
          locationLng: location?.lng ?? null,
          locationPlaceId: location?.placeId || null,
          onlineMeetingLink: onlineMeetingLink || null,
          discussionLink: discussionLink.trim() || null,
          capacity: capacity || null,
          registrationDeadline: registrationDeadline ? registrationDeadline.toISOString() : null,
          coverUrl: coverUrl || null,
          status: submitStatus,
          isApproveRequired,
          priceMinor,
          paymentInstructions: submittedPaymentInstructions,
          customQuestions: customQuestions ?? null,
          reminderTimes,
          reminderMessage: reminderMessage || null,
        } as any,
        { method: 'POST', encType: 'application/json', action: '/api/events/update' }
      );

      // Navigation, toasts, and schedule-update are handled in the updateFetcher useEffect
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {mode === 'create' ? 'Create Event' : 'Edit Event'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'create'
              ? 'Fill in the details to create a new event'
              : 'Update event information'}
          </p>
        </div>

        {/* Mobile: Preview only — Save/Publish live in sticky bottom bar */}
        <Button
          type="button"
          variant="outline"
          className="w-full lg:hidden"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="h-4 w-4 mr-2 shrink-0" />
          Preview
        </Button>

        {/* Desktop actions */}
        <div className="hidden gap-2 lg:flex">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4 mr-2 shrink-0" />
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isBusy || !isValid()}
            onClick={() => handleSubmit(true)}
          >
            {isBusy ? (
              <>
                <Spinner className="h-4 w-4 mr-2 shrink-0" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2 shrink-0" />
                Save as Draft
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={isBusy || !isValid()}
            onClick={() => handleSubmit(false)}
          >
            {isBusy ? (
              <>
                <Spinner className="h-4 w-4 mr-2 shrink-0" />
                Publishing...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2 shrink-0" />
                Publish Event
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Event Cover + Event Details side by side */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[auto_1fr]">
        <div className="w-full max-w-xs shrink-0 self-start lg:w-96 lg:max-w-none">
          <EventCoverUpload
            communitySlug={communitySlug}
            eventId={eventId}
            currentCoverUrl={coverUrl}
            onCoverUpdate={setCoverUrl}
            isCreating={mode === 'create'}
          />
        </div>

        <Card className="flex h-full min-h-0 min-w-0 flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <EventBasicInfo
              title={title}
              description={description}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
            />
          </CardContent>
        </Card>
      </div>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventDateTime
            startDate={startDate}
            startTime={startTime}
            endTime={endTime}
            timezone={timezone}
            onStartDateChange={setStartDate}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            onTimezoneChange={setTimezone}
          />
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventLocation
            eventType={eventType}
            location={location}
            legacyAddress={!location ? (initialData?.locationAddress || undefined) : undefined}
            onlineMeetingLink={onlineMeetingLink}
            onEventTypeChange={setEventType}
            onLocationChange={setLocation}
            onOnlineMeetingLinkChange={setOnlineMeetingLink}
          />
        </CardContent>
      </Card>

      {showPriceCard && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EventPrice
              priceInput={priceInput}
              currency={TICKET_CURRENCY}
              disabled={!isPaidTicketingEnabled}
              errorMessage={priceError}
              onPriceInputChange={setPriceInput}
            />
            {needsPaymentInstructions && (
              <div className="mt-6">
                <EventPaymentInstructions
                  value={paymentInstructions}
                  onChange={setPaymentInstructions}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance Reminders */}
      <Card className="mt-10! pb-[14px]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Attendance Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventReminderTimes
            reminderTimes={reminderTimes}
            onReminderTimesChange={setReminderTimes}
          />
          <Accordion type="single" collapsible className="mt-6 w-full">
            <AccordionItem value="message" className="border-b-0">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  Message Customization
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <EventReminderEmailCustomization
                  customMessage={reminderMessage}
                  onCustomMessageChange={setReminderMessage}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Attendee Discussion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Attendee Discussion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventDiscussion
            discussionLink={discussionLink}
            onDiscussionLinkChange={setDiscussionLink}
          />
        </CardContent>
      </Card>

      <Card className="mt-10! py-[10px]">
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {/* Registration Controls */}
            <AccordionItem value="registration">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Registration Controls
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <EventCapacity
                  capacity={capacity}
                  registrationDeadline={registrationDeadline}
                  isApproveRequired={isApproveRequired}
                  isApprovalLocked={priceMinor !== null}
                  onCapacityChange={setCapacity}
                  onRegistrationDeadlineChange={setRegistrationDeadline}
                  onIsApproveRequiredChange={setIsApproveRequired}
                  eventStartDate={startDate}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Attendee Information */}
            <AccordionItem value="attendee-info">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Attendee Information
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <CustomQuestionsBuilder
                  value={customQuestions}
                  onChange={setCustomQuestions}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Invite Co-Hosts - show in edit mode or create mode (collect pending invites) */}
            {(mode === 'edit' && eventId) || mode === 'create' ? (
              <AccordionItem value="co-hosts">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                    Invite Co-Hosts
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Invite other communities to co-host this event
                  </p>
                  {(mode === 'create' || isHost) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInviteDialog(true)}
                    >
                      <Users2 className="h-4 w-4 mr-2" />
                      Invite Community
                    </Button>
                  )}
                </div>
                
                {loadingCollaborations ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : (
                  <CollaborationList
                    collaborations={collaborations}
                    isHost={isHost}
                    pendingInvites={pendingInvites}
                    onRemovePending={(communityId) => setPendingInvites((prev) => prev.filter((x) => x.id !== communityId))}
                    onRemove={async (collaborationId) => {
                      try {
                        const formData = new FormData();
                        formData.append('intent', 'remove-collaboration');
                        formData.append('collaborationId', collaborationId);
                        
                        const response = await fetch(Routes.community.eventCollaboration(communitySlug, eventSlug!), {
                          method: 'POST',
                          body: formData,
                        });
                        
                        const result = await response.json();
                        if (result.success) {
                          toast.success('Collaboration removed');
                          // Reload collaborations
                          const supabase = createClient();
                          const { data: collabs } = await supabase
                            .from('event_collaborations')
                            .select(`
                              *,
                              community:communities!event_collaborations_community_id_fkey (
                                id,
                                name,
                                slug,
                                logo_url
                              )
                            `)
                            .eq('event_id', eventId!)
                            .order('created_at', { ascending: true });
                          
                          if (collabs) {
                            const formatted = collabs.map((c: any) => ({
                              id: c.id,
                              role: c.role as 'host' | 'co-host',
                              status: c.status as 'pending' | 'accepted' | 'rejected',
                              invited_at: c.invited_at,
                              accepted_at: c.accepted_at,
                              community: Array.isArray(c.community) ? c.community[0] : c.community,
                            })) as CollaborationWithCommunity[];
                            setCollaborations(formatted);
                          }
                        } else {
                          toast.error(result.error || 'Failed to remove collaboration');
                        }
                      } catch (error) {
                        console.error('Error removing collaboration:', error);
                        toast.error('Failed to remove collaboration');
                      }
                    }}
                  />
                  )}

                  {/* determine communities that should be hidden from search (already pending or already invited) */}
                  <CollaborationInviteDialog
                    open={showInviteDialog}
                    onOpenChange={setShowInviteDialog}
                    eventId={mode === 'edit' ? eventId : undefined}
                    eventSlug={mode === 'edit' ? eventSlug : undefined}
                    hostCommunityId={communityId}
                    communitySlug={communitySlug}
                    excludedIds={[...pendingInvites.map((p) => p.id), ...collaborations.map((c) => c.community.id)]}
                    collectOnly={mode === 'create'}
                    onCollect={(community) => {
                      setPendingInvites((prev) => (prev.some((p) => p.id === community.id) ? prev : [...prev, community]));
                    }}
                    onSuccess={async () => {
                      // Reload collaborations
                      const supabase = createClient();
                      const { data: collabs } = await supabase
                        .from('event_collaborations')
                        .select(`
                          *,
                          community:communities!event_collaborations_community_id_fkey (
                            id,
                            name,
                            slug,
                            logo_url
                          )
                        `)
                        .eq('event_id', eventId!)
                        .order('created_at', { ascending: true });
                    
                      if (collabs) {
                        const formatted = collabs.map((c: any) => ({
                          id: c.id,
                          role: c.role as 'host' | 'co-host',
                          status: c.status as 'pending' | 'accepted' | 'rejected',
                          invited_at: c.invited_at,
                          accepted_at: c.accepted_at,
                          community: Array.isArray(c.community) ? c.community[0] : c.community,
                        })) as CollaborationWithCommunity[];
                        setCollaborations(formatted);
                      }
                    }}
                  />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : null}
          </Accordion>
        </CardContent>
      </Card>

      {/* Mobile Submit Buttons */}
      <div className="lg:hidden sticky bottom-0 bg-background border-t p-4 -mx-4 flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isBusy || !isValid()}
          onClick={() => handleSubmit(true)}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={isBusy || !isValid()}
          onClick={() => handleSubmit(false)}
        >
          Publish
        </Button>
      </div>

      {/* Preview Sheet */}
      <Sheet open={showPreview} onOpenChange={setShowPreview}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Preview</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-background">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={title || 'Event cover'}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <Calendar className="h-16 w-16 text-primary/30" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold leading-tight tracking-tight">
                {title || 'Event Title'}
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Date</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {startDate ? dayjs(startDate).format('MMM D, YYYY') : 'Not set'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {startTime || 'No time set'}
                    {endTime && ` – ${endTime}`}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Location</span>
                  </div>
                  {location?.name || location?.address ? (
                    <>
                      <p className="truncate text-sm font-semibold text-foreground">
                        {location.name || location.address}
                      </p>
                      {location.name && location.address && (
                        <p className="truncate text-xs text-muted-foreground">{location.address}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground">
                        {eventType === 'online' ? 'Online' : eventType === 'hybrid' ? 'Hybrid' : 'In-person'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {eventType === 'online'
                          ? 'Virtual event'
                          : eventType === 'hybrid'
                            ? 'In-person & online'
                            : 'Venue TBA'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-medium text-muted-foreground">About</h3>
                {description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No description yet</p>
                )}
              </div>

              {priceMinor !== null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Ticket className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatMoney(priceMinor, TICKET_CURRENCY)}</span>
                </div>
              )}

              {capacity && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>Max {capacity} attendees</span>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

