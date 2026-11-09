import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/card';
import { Button } from '~/shared/components/ui/button';
import { Separator } from '~/shared/components/ui/separator';
import { Spinner } from '~/shared/components/ui/spinner';
import { Badge } from '~/shared/components/ui/badge';
import { Input } from '~/shared/components/ui/input';
import { Label } from '~/shared/components/ui/label';
import { Save, FileText, Calendar, Eye, ExternalLink, Link as LinkIcon, Users } from 'lucide-react';
import { EventCoverUpload } from '~/modules/events/components/event-form/event-cover-upload';
import { EventDateTime, carryEndDate, isEndBeforeStart } from '~/modules/events/components/event-form/fields/event-datetime';
import { PhysicalLocationField } from '~/modules/events/components/event-form/fields/physical-location-field';
import { createClient } from '~/shared/lib/supabase/client';
import { ensureUniqueEventSlugClient } from '~/modules/events/data/events-repo.client';
import { toast } from 'sonner';
import type { Database } from '~/shared/models/database.types';
import type { ExternalPlatform } from '~/modules/events/model/event.types';
import type { LocationValue } from '~/modules/events/model/event-location.types';
import {
  detectExternalPlatform,
  isValidExternalUrl,
} from '~/modules/events/utils/external-platform';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

type EventStatus = Database['public']['Enums']['event_status'];

interface ExternalEventFormProps {
  communitySlug: string;
  communityId: string;
  communityName: string;
  eventId?: string;
  mode: 'create' | 'edit';
  initialData?: {
    title?: string;
    startDate?: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    location?: LocationValue | null;
    locationAddress?: string;
    coverUrl?: string;
    status?: EventStatus;
    externalRegistrationUrl?: string;
  };
}

export function ExternalEventForm({
  communitySlug,
  communityId,
  communityName,
  eventId,
  mode,
  initialData,
}: ExternalEventFormProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState(initialData?.title || '');
  const [startDate, setStartDate] = useState<Date | undefined>(initialData?.startDate);
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData?.endDate ?? initialData?.startDate
  );
  const [endTime, setEndTime] = useState(initialData?.endTime || '10:00');

  const handleStartDateChange = (date: Date | undefined) => {
    setEndDate(carryEndDate(startDate, endDate, date));
    setStartDate(date);
  };

  const effectiveEndDate = endDate ?? startDate;
  const endsBeforeStart = isEndBeforeStart(startDate, startTime, effectiveEndDate, endTime);
  const [timezoneValue, setTimezoneValue] = useState(initialData?.timezone || 'Asia/Baku');
  const [location, setLocation] = useState<LocationValue | null>(initialData?.location ?? null);
  const [coverUrl, setCoverUrl] = useState(initialData?.coverUrl || '');
  const [externalRegistrationUrl, setExternalRegistrationUrl] = useState(
    initialData?.externalRegistrationUrl || '',
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const [externalPlatform, setExternalPlatform] = useState<ExternalPlatform>('other');

  useEffect(() => {
    if (externalRegistrationUrl) {
      setExternalPlatform(detectExternalPlatform(externalRegistrationUrl));
    }
  }, [externalRegistrationUrl]);

  useEffect(() => {
    if (externalRegistrationUrl && !isValidExternalUrl(externalRegistrationUrl)) {
      setUrlError('Please enter a valid URL (starting with http:// or https://)');
    } else {
      setUrlError(null);
    }
  }, [externalRegistrationUrl]);

  const isValid = () => {
    if (!title.trim()) return false;
    if (!startDate) return false;
    if (endsBeforeStart) return false;
    if (!startTime) return false;
    if (!externalRegistrationUrl.trim()) return false;
    if (!isValidExternalUrl(externalRegistrationUrl)) return false;
    return true;
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (endsBeforeStart) {
      toast.error('Event must end after it starts');
      return;
    }
    if (!isValid()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const submitStatus: EventStatus = isDraft ? 'draft' : 'published';

      const startDateTime = dayjs
        .tz(`${dayjs(startDate).format('YYYY-MM-DD')}T${startTime}`, timezoneValue)
        .toISOString();

      const endDateTime = endTime
        ? dayjs
            .tz(`${dayjs(effectiveEndDate).format('YYYY-MM-DD')}T${endTime}`, timezoneValue)
            .toISOString()
        : null;

      const eventData = {
        community_id: communityId,
        created_by: user.id,
        title,
        description: null,
        start_time: startDateTime,
        end_time: endDateTime,
        timezone: timezoneValue,
        event_type: 'in-person' as const,
        location_address: location?.address || initialData?.locationAddress?.trim() || null,
        location_name: location?.name ?? null,
        location_lat: location?.lat ?? null,
        location_lng: location?.lng ?? null,
        location_place_id: location?.placeId ?? null,
        online_meeting_link: null,
        discussion_link: null,
        cover_url: coverUrl || null,
        status: submitStatus,
        registration_type: 'external',
        external_platform: externalPlatform,
        external_registration_url: externalRegistrationUrl.trim(),
        capacity: null,
        registration_deadline: null,
        is_approve_required: false,
        custom_questions: null,
      };

      if (mode === 'create') {
        const slug = await ensureUniqueEventSlugClient(communityId, title);

        const { data: newEvent, error } = await supabase
          .from('events')
          .insert({ ...eventData, slug })
          .select('id')
          .single();

        if (error || !newEvent) {
          console.error('Error creating event:', error);
          toast.error(error?.message || 'Failed to create event');
          return;
        }

        const { error: collabError } = await supabase.from('event_collaborations').insert({
          event_id: newEvent.id,
          community_id: communityId,
          role: 'host',
          status: 'accepted',
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        });

        if (collabError) {
          console.error('Error creating host collaboration:', collabError);
        }

        toast.success(`Link event ${isDraft ? 'saved as draft' : 'published'} successfully!`);
        navigate(`/dashboard/${communitySlug}/events`);
      } else if (mode === 'edit' && eventId) {
        const { data: collaboration } = await supabase
          .from('event_collaborations')
          .select('role')
          .eq('event_id', eventId)
          .eq('community_id', communityId)
          .eq('role', 'host')
          .eq('status', 'accepted')
          .single();

        if (!collaboration) {
          toast.error('Only host community can update event details');
          return;
        }

        const { error } = await supabase.from('events').update(eventData).eq('id', eventId);

        if (error) {
          console.error('Error updating event:', error);
          toast.error(error.message || 'Failed to update event');
          return;
        }

        toast.success('Event updated successfully!');
        navigate(`/dashboard/${communitySlug}/events`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {mode === 'create' ? 'Create Link Event' : 'Edit Link Event'}
            </h1>
            <Badge variant="outline" className="border-primary/50 bg-primary/5 text-primary">
              <ExternalLink className="h-3 w-3 mr-1" />
              Link event
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'create'
              ? 'Add a simple event card that links to an external event page'
              : 'Update link event information'}
          </p>
        </div>
        <div className="hidden lg:flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || !isValid()}
            onClick={() => handleSubmit(true)}
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Save as Draft
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || !isValid()}
            onClick={() => handleSubmit(false)}
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Publishing...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Cover</CardTitle>
            </CardHeader>
            <CardContent>
              <EventCoverUpload
                communitySlug={communitySlug}
                eventId={eventId}
                currentCoverUrl={coverUrl}
                onCoverUpdate={setCoverUrl}
                isCreating={mode === 'create'}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-page-url">Event Page URL *</Label>
                <Input
                  id="event-page-url"
                  type="url"
                  placeholder="https://eventbrite.com/e/some-event"
                  value={externalRegistrationUrl}
                  onChange={(e) => setExternalRegistrationUrl(e.target.value)}
                  className={urlError ? 'border-red-500' : ''}
                />
                {urlError ? (
                  <p className="text-xs text-red-500">{urlError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Where visitors go when they click &quot;Go to event&quot;
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-name">Event Name *</Label>
                <Input
                  id="event-name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Happy Hour Drinks"
                  maxLength={200}
                />
              </div>

              <PhysicalLocationField
                location={location}
                legacyAddress={
                  !location && initialData?.locationAddress
                    ? initialData.locationAddress
                    : undefined
                }
                onLocationChange={setLocation}
              />

              <div className="space-y-2">
                <Label>Host</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{communityName}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Event Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EventDateTime
                startDate={startDate}
                startTime={startTime}
                endDate={effectiveEndDate}
                endTime={endTime}
                endsBeforeStart={endsBeforeStart}
                timezone={timezoneValue}
                onStartDateChange={handleStartDateChange}
                onStartTimeChange={setStartTime}
                onEndDateChange={setEndDate}
                onEndTimeChange={setEndTime}
                onTimezoneChange={setTimezoneValue}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="lg:hidden sticky bottom-0 bg-background border-t p-4 -mx-4 flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isSubmitting || !isValid()}
          onClick={() => handleSubmit(true)}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={isSubmitting || !isValid()}
          onClick={() => handleSubmit(false)}
        >
          Publish
        </Button>
      </div>
    </div>
  );
}
