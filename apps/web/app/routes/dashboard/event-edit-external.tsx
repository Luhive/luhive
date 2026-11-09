import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import type { Database } from '~/shared/models/database.types';
import { useDashboardContext } from '~/modules/dashboard/hooks/use-dashboard-context';
import { DashboardEventFormSkeleton } from '~/modules/dashboard/components/dashboard-event-form-skeleton';
import { ExternalEventForm } from '~/modules/events/components/event-form/external-event-form';
import { getEventByIdClient } from '~/modules/events/data/events-repo.client';
import { toLocationValue } from '~/modules/events/utils/event-location';
import type { Event } from '~/shared/models/entity.types';

dayjs.extend(utc);
dayjs.extend(timezone);

export function meta() {
  return [
    { title: 'Edit Link Event - Dashboard' },
    { name: 'description', content: 'Edit an existing link event' },
  ];
}

export default function EditExternalEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const dashboardData = useDashboardContext();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dashboardData?.community || !eventId) return;

    let cancelled = false;

    async function fetchEvent() {
      try {
        setLoading(true);

        const { event, error } = await getEventByIdClient(eventId, dashboardData.community.id);

        if (cancelled) return;

        if (error || !event) {
          console.error('Error fetching event:', error);
          toast.error('Failed to load event');
          navigate(`/dashboard/${dashboardData.community.slug}/events`);
          return;
        }

        // If this is not an external event, redirect to the standard edit page
        if (event.registration_type !== 'external') {
          navigate(
            `/dashboard/${dashboardData.community.slug}/events/${event.id}/edit`,
            { replace: true },
          );
          return;
        }

        setEvent(event);
      } catch (error) {
        if (cancelled) return;
        console.error('Error:', error);
        toast.error('Failed to load event');
        navigate(`/dashboard/${dashboardData.community.slug}/events`);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchEvent();

    return () => {
      cancelled = true;
    };
  }, [dashboardData?.community, eventId, navigate]);

  if (!dashboardData) {
    return <DashboardEventFormSkeleton />;
  }

  if (loading || !event) {
    return <DashboardEventFormSkeleton />;
  }

  const eventStart = dayjs(event.start_time).tz(event.timezone);
  const startDate = event.start_time
    ? new Date(eventStart.year(), eventStart.month(), eventStart.date())
    : undefined;
  const startTime = event.start_time ? eventStart.format('HH:mm') : '09:00';

  const eventEnd = event.end_time ? dayjs(event.end_time).tz(event.timezone) : null;
  const endTime = eventEnd ? eventEnd.format('HH:mm') : undefined;
  const endDate = eventEnd ? new Date(eventEnd.year(), eventEnd.month(), eventEnd.date()) : undefined;

  const initialData = {
    title: event.title ?? '',
    startDate,
    endDate,
    startTime,
    endTime,
    timezone: event.timezone,
    location: toLocationValue(event),
    locationAddress: event.location_address ?? '',
    coverUrl: event.cover_url ?? '',
    status: event.status,
    externalRegistrationUrl: event.external_registration_url ?? '',
  };

  return (
    <div className="py-4 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <ExternalEventForm
          communitySlug={dashboardData.community.slug}
          communityId={dashboardData.community.id}
          communityName={dashboardData.community.name}
          eventId={event.id}
          mode="edit"
          initialData={initialData}
        />
      </div>
    </div>
  );
}
