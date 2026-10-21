import { isPaidTicketingEnabled } from '@luhive/domain/v1/paid-ticketing-flag';
import * as CommunitySettings from '@luhive/domain/v1/community-settings';
import { EventForm } from '~/modules/events/components/event-form/event-form';
import { useDashboardContext } from '~/modules/dashboard/hooks/use-dashboard-context';

export function meta() {
  return [
    { title: "Create Event - Dashboard" },
    { name: "description", content: "Create a new community event" },
  ];
}

export default function CreateEventPage() {
  const { community } = useDashboardContext();

  return (
    <div className="py-4 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <EventForm
          communitySlug={community.slug}
          communityId={community.id}
          mode="create"
          isPaidTicketingEnabled={isPaidTicketingEnabled(community.settings)}
          paymentProvider={CommunitySettings.getPaymentProvider(community.settings)}
        />
      </div>
    </div>
  );
}
