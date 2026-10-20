import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '~/shared/components/ui/button';
import { Skeleton } from '~/shared/components/ui/skeleton';
import { Input } from '~/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/shared/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '~/shared/components/ui/dropdown-menu';
import { Badge } from '~/shared/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/shared/components/ui/tooltip';
import {
  Plus,
  Search,
  Calendar,
  Filter,
  MapPin,
  Users,
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2,
  BarChart3,
  Clock,
  ChevronDown,
  Link as LinkIcon,
  Eye,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import type { Event, EventStatus, EventType } from '~/shared/models/entity.types';
import type { ExternalPlatform } from '~/modules/events/model/event.types';
import dayjs from 'dayjs';
import { Routes } from '~/shared/lib/routing/routes';
import { publicEventSlug } from '~/modules/events/utils/event-slug';
import { copyEventLink } from '~/modules/events/utils/copy-event-link';
import { isPaidEvent } from '~/modules/events/utils/event-price-label';
import { formatMoney } from '@luhive/domain/v1/money';
import { cn } from '~/shared/lib/utils';
import {
  getExternalPlatformName,
  getExternalPlatformIcon,
} from '~/modules/events/utils/external-platform';

type RegistrationTypeFilter = 'all' | 'luhive' | 'external';

interface EventListProps {
  events: (Event & { registration_count?: number; communityRole?: "host" | "co-host" })[];
  communitySlug: string;
  ticketRevenue?: Record<string, { revenueMinor: number }>;
  showRevenue?: boolean;
  totalRevenue?: { totalRevenueMinor: number; currency: string } | null;
  onDelete?: (eventId: string) => void;
  onStatusChange?: (eventId: string, newStatus: Extract<EventStatus, 'draft' | 'published'>) => void;
}

export function EventList({ events, communitySlug, ticketRevenue, showRevenue = false, totalRevenue, onDelete, onStatusChange }: EventListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [registrationTypeFilter, setRegistrationTypeFilter] = useState<RegistrationTypeFilter>('all');
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  function handleCopyEventLink(event: Event) {
    copyEventLink(communitySlug, event);
    setCopiedEventId(event.id);
    setTimeout(() => setCopiedEventId(null), 2000);
  }

  // Filter events
  const filteredEvents = events.filter((event) => {
    // Search filter
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && event.status !== statusFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== 'all' && event.event_type !== typeFilter) {
      return false;
    }

    // Time filter
    if (timeFilter !== 'all') {
      const eventDate = dayjs(event.start_time);
      const now = dayjs();
      if (timeFilter === 'upcoming' && eventDate.isBefore(now)) {
        return false;
      }
      if (timeFilter === 'past' && eventDate.isAfter(now)) {
        return false;
      }
    }

    // Registration type filter
    if (registrationTypeFilter !== 'all') {
      const isExternal = event.registration_type === 'external';
      if (registrationTypeFilter === 'external' && !isExternal) {
        return false;
      }
      if (registrationTypeFilter === 'luhive' && isExternal) {
        return false;
      }
    }

    return true;
  });

  // Sort by start time (latest first)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    return dayjs(b.start_time).valueOf() - dayjs(a.start_time).valueOf();
  });

  // Helper function to format event type
  const formatEventType = (type: EventType): string => {
    const typeMap: Record<EventType, string> = {
      'in-person': 'in-person',
      online: 'online',
      hybrid: 'hybrid',
    };
    return typeMap[type] || type;
  };

  // Helper function to check if event is external
  const isExternalEvent = (event: Event): boolean => {
    return event.registration_type === 'external';
  };

  // Helper function to get registration/subscription count for an event
  const getRegistrationCount = (event: Event & { registration_count?: number }): number => {
    // For both native and external events, use registration_count from event_registrations
    return event.registration_count || 0;
  };

  // Stats
  const stats = {
    total: events.length,
    published: events.filter((e) => e.status === 'published').length,
    draft: events.filter((e) => e.status === 'draft').length,
    upcoming: events.filter((e) => dayjs(e.start_time).isAfter(dayjs())).length,
    external: events.filter((e) => e.registration_type === 'external').length,
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Events</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your community events</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/${communitySlug}/events/create`} className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span className="font-medium">Luhive Event</span>
                  <span className="text-xs text-muted-foreground">
                    Full registration & analytics
                  </span>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to={`/dashboard/${communitySlug}/events/create-external`}
                className="flex items-center"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span className="font-medium">Link Event</span>
                  <span className="text-xs text-muted-foreground">
                    Link to external event page
                  </span>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-2 gap-4 ${showRevenue ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-5"}`}>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Events</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.published}</div>
          <div className="text-xs text-muted-foreground">Published</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.draft}</div>
          <div className="text-xs text-muted-foreground">Drafts</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.upcoming}</div>
          <div className="text-xs text-muted-foreground">Upcoming</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.external}</div>
          <div className="text-xs text-muted-foreground">Link</div>
        </div>
        {showRevenue && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex h-8 items-center">
              {totalRevenue ? (
                <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                  {formatMoney(totalRevenue.totalRevenueMinor, totalRevenue.currency)}
                </div>
              ) : (
                <Skeleton className="h-6 w-28 rounded bg-green-600/25 dark:bg-green-500/25" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as EventStatus | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as EventType | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="in-person">In-person</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>

        {/* Time Filter */}
        <Select
          value={timeFilter}
          onValueChange={(value) => setTimeFilter(value as 'all' | 'upcoming' | 'past')}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>

        {/* Registration Type Filter */}
        <Select
          value={registrationTypeFilter}
          onValueChange={(value) => setRegistrationTypeFilter(value as RegistrationTypeFilter)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <LinkIcon className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Registration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="luhive">Luhive</SelectItem>
            <SelectItem value="external">Link event</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters Summary */}
      {(searchQuery ||
        statusFilter !== 'all' ||
        typeFilter !== 'all' ||
        timeFilter !== 'all' ||
        registrationTypeFilter !== 'all') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary">
              Search: {searchQuery}
              <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-foreground">
                ×
              </button>
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-foreground">
                ×
              </button>
            </Badge>
          )}
          {typeFilter !== 'all' && (
            <Badge variant="secondary">
              Type: {typeFilter}
              <button onClick={() => setTypeFilter('all')} className="ml-1 hover:text-foreground">
                ×
              </button>
            </Badge>
          )}
          {timeFilter !== 'all' && (
            <Badge variant="secondary">
              Time: {timeFilter}
              <button onClick={() => setTimeFilter('all')} className="ml-1 hover:text-foreground">
                ×
              </button>
            </Badge>
          )}
          {registrationTypeFilter !== 'all' && (
            <Badge variant="secondary">
              Registration: {registrationTypeFilter === 'luhive' ? 'Luhive' : 'Link event'}
              <button
                onClick={() => setRegistrationTypeFilter('all')}
                className="ml-1 hover:text-foreground"
              >
                ×
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setTypeFilter('all');
              setTimeFilter('all');
              setRegistrationTypeFilter('all');
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Events List */}
      {sortedEvents.length > 0 ? (
        <div className="relative">
          {/* Continuous vertical connecting line - Desktop Only */}
          <div className="hidden md:block absolute left-[120px] top-0 bottom-0 w-px border-l border-dashed border-gray-200" />

          <div className="space-y-3">
            {(() => {
              // Group events by month, then by date
              const eventsByMonth = sortedEvents.reduce(
                (acc, event) => {
                  const monthKey = dayjs(event.start_time).format('YYYY-MM');
                  const dateKey = dayjs(event.start_time).format('YYYY-MM-DD');

                  if (!acc[monthKey]) {
                    acc[monthKey] = {};
                  }
                  if (!acc[monthKey][dateKey]) {
                    acc[monthKey][dateKey] = [];
                  }
                  acc[monthKey][dateKey].push(event);
                  return acc;
                },
                {} as Record<string, Record<string, typeof sortedEvents>>
              );

              const monthEntries = Object.entries(eventsByMonth);

              return monthEntries.flatMap(([monthKey, datesByMonth]) => {
                const firstEventInMonth = Object.values(datesByMonth)[0][0];
                const monthName = dayjs(firstEventInMonth.start_time).format('MMMM YYYY');
                const dateEntries = Object.entries(datesByMonth);

                return [
                  // Mobile: Month Header
                  <div key={`month-${monthKey}`} className="md:hidden pt-4 first:pt-0">
                    <div className="text-xl font-bold text-gray-900">{monthName}</div>
                  </div>,
                  // Date groups for this month
                  ...dateEntries.map(([dateKey, dateEvents], dateIndex) => {
                    const firstEvent = dateEvents[0];
                    const eventDate = dayjs(firstEvent.start_time);
                    const date = eventDate.format('MMM D');
                    const dayName = eventDate.format('dddd');
                    const isLast = dateIndex === dateEntries.length - 1;

                    return (
                      <div key={dateKey} className="flex flex-col md:flex-row gap-6 relative">
                        {/* Timeline Date Entry - Desktop Only */}
                        <div className="hidden md:flex flex-col w-[120px] flex-shrink-0 relative">
                          <div className="relative">
                            <div className="relative flex items-start gap-4 py-2 pr-4">
                              {/* Date and Day Name */}
                              <div className="flex-1 min-w-0">
                                <div className="text-lg font-bold text-gray-900">{date}</div>
                                <div className="text-sm text-gray-500 mt-0.5">{dayName}</div>
                              </div>
                            </div>
                            {/* Dot indicator - absolutely positioned to align with line */}
                            <div className="absolute right-[-0.28rem] top-1/2 -translate-y-1/2 z-10">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                            </div>
                          </div>
                        </div>

                        {/* Events for this date */}
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Mobile: Date Header */}
                          <div className="md:hidden pb-2 border-b border-gray-100">
                            <div className="text-lg font-bold text-gray-900">{date}</div>
                            <div className="text-sm text-gray-500 mt-0.5">{dayName}</div>
                          </div>

                          {dateEvents.map((event) => {
                            const eventDate = dayjs(event.start_time);
                            const weekday = eventDate.format('ddd').toUpperCase();
                            const date = eventDate.format('MMM D');
                            const time = eventDate.format('h:mm A');
                            const registrationCount = getRegistrationCount(event);
                            const revenueLabel =
                              ticketRevenue && isPaidEvent(event)
                                ? formatMoney(
                                    ticketRevenue[event.id]?.revenueMinor ?? 0,
                                    event.currency,
                                  )
                                : null;
                            const capacity = event.capacity;
                            const location =
                              event.event_type === "in-person"
                                ? event.location_name || event.location_address
                                : event.event_type === "online"
                                  ? "Online Event"
                                  : event.location_address || "Hybrid Event";
                            const isExternal = isExternalEvent(event);
                            const platform = event.external_platform as ExternalPlatform | null;
                            const PlatformIcon = platform
                              ? getExternalPlatformIcon(platform)
                              : null;

                            return (
                              <div
                                key={event.id}
                                className="group min-w-0 bg-white border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row gap-6 hover:shadow-xs transition-all duration-200 hover:border-gray-200"
                              >
                                {/* Left Section: Cover Picture with Date Overlay (Desktop) / Small Icon + Date (Mobile) */}
                                <div className="flex flex-col gap-3 min-w-[200px] md:min-w-0 md:self-stretch md:gap-0">
                                  {/* Mobile: Small Icon + Date Side by Side */}
                                  <div className="flex md:hidden items-center gap-4">
                                    <div className="relative h-20 w-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100 aspect-square">
                                      {event.cover_url ? (
                                        <img
                                          src={event.cover_url}
                                          alt={event.title}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-2xl">
                                            📅
                                          </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                                        {weekday}
                                      </span>
                                      <span className="text-xl font-bold text-gray-900">
                                        {date}
                                      </span>
                                      <span className="text-xs text-gray-500 mt-0.5">{time}</span>

                                      {/* Mobile: Status and Registration Badges */}
                                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            'h-5 px-1.5 text-[10px] uppercase tracking-wider font-semibold rounded-md',
                                            event.status === 'published'
                                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                          )}
                                        >
                                          {event.status}
                                        </Badge>
                                        {isExternal ? (
                                          <Badge
                                            variant="outline"
                                            className="h-5 px-1.5 text-[10px] uppercase tracking-wider font-semibold rounded-md border-primary/50 bg-primary/5 text-primary"
                                          >
                                            {PlatformIcon && (
                                              <PlatformIcon className="w-3 h-3 mr-1 text-primary" />
                                            )}
                                            Link event
                                          </Badge>
                                        ) : (
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                                              <Users className="w-3 h-3 text-primary" />
                                              <span className="text-xs font-bold text-primary">
                                                {registrationCount}
                                              </span>
                                              <span className="text-[10px] text-primary/70">
                                                /{capacity || '∞'}
                                              </span>
                                            </div>
                                        )}
                                        {revenueLabel && (
                                          <span className="text-xs font-bold text-green-600 dark:text-green-500">
                                            {revenueLabel}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Desktop: Full Height Cover Picture */}
                                  <div className="hidden md:flex relative h-full max-h-[180px] aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-100 flex-shrink-0">
                                    {event.cover_url ? (
                                      <img
                                        src={event.cover_url}
                                        alt={event.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-4xl">
                                          📅
                                        </div>
                                    )}
                                  </div>
                                </div>

                                {/* Center Section: Title, Location, Registration */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                  {/* Desktop: Status and Type Badges */}
                                  <div className="hidden md:flex items-center gap-2 mb-1">
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        'h-5 px-1.5 text-[10px] uppercase tracking-wider font-semibold rounded-md',
                                        event.status === 'published'
                                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      )}
                                    >
                                      {event.status}
                                    </Badge>
                                    <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100">
                                      {formatEventType(event.event_type)}
                                    </span>
                                    {isExternal && (
                                      <Badge
                                        variant="outline"
                                        className="h-5 px-1.5 text-[10px] uppercase tracking-wider font-semibold rounded-md border-primary/50 bg-primary/5 text-primary"
                                      >
                                        {PlatformIcon && (
                                          <PlatformIcon className="w-3 h-3 mr-1 text-primary" />
                                        )}
                                        {platform
                                          ? getExternalPlatformName(platform)
                                          : 'Link event'}
                                      </Badge>
                                    )}
                                  </div>
                                  <h3 className="text-lg font-bold text-gray-900 line-clamp-2 break-words group-hover:text-primary transition-colors">
                                    {event.title}
                                  </h3>
                                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      <span className="truncate max-w-[200px]">{location}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>{time}</span>
                                    </div>
                                  </div>

                                  {/* Desktop: Registration/Subscription Count */}
                                  <div className="hidden md:flex items-center gap-3 mt-3">
                                    {isExternal ? (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-primary/5 rounded-full border border-primary/20 w-fit">
                                        <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-xs text-primary font-medium">
                                          Link event
                                        </span>
                                      </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-primary/5 rounded-full border border-primary/20 w-fit transition-colors group-hover:bg-primary/15 group-hover:border-primary/30">
                                          <Users className="w-3.5 h-3.5 text-primary" />
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-bold text-primary">
                                              {registrationCount}
                                            </span>
                                            <span className="text-xs text-primary/70 font-medium">
                                              / {capacity ? capacity : '∞'}
                                            </span>
                                            <span className="text-xs text-primary/70 font-medium ml-1">
                                              registered
                                            </span>
                                          </div>
                                        </div>
                                    )}
                                    {revenueLabel && (
                                      <span className="text-sm font-bold text-green-600 dark:text-green-500">
                                        {revenueLabel}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right Section: Action Buttons */}
                                <div className="flex shrink-0 items-center gap-4 md:pl-6 md:border-l md:border-gray-50 md:justify-end">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center border border-gray-100 bg-gray-50/50 rounded-lg p-1 gap-1">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md"
                                            onClick={() => handleCopyEventLink(event)}
                                          >
                                            {copiedEventId === event.id ? (
                                              <Check className="w-4 h-4 text-green-600" />
                                            ) : (
                                              <Copy className="w-4 h-4" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {copiedEventId === event.id ? 'Copied!' : 'Copy event link'}
                                        </TooltipContent>
                                      </Tooltip>
                                      <div className="w-px h-4 bg-gray-200"></div>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md"
                                            asChild
                                          >
                                            <a
                                              href={Routes.community.event(communitySlug, publicEventSlug(event))}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>View event page</TooltipContent>
                                      </Tooltip>
                                      {!isExternal && event.communityRole !== "co-host" && (
                                        <>
                                          <div className="w-px h-4 bg-gray-200"></div>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md"
                                                asChild
                                              >
                                                <Link
                                                  to={`/dashboard/${communitySlug}/attenders?eventId=${event.id}`}
                                                >
                                                  <Users className="w-4 h-4" />
                                                </Link>
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Manage guests</TooltipContent>
                                          </Tooltip>
                                        </>
                                      )}
                                      <div className="w-px h-4 bg-gray-200"></div>
                                      {event.communityRole === "co-host" ? (
                                        <>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md"
                                                asChild
                                              >
                                                <a
                                                  href={Routes.community.event(communitySlug, publicEventSlug(event))}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  <Eye className="w-4 h-4" />
                                                </a>
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View event</TooltipContent>
                                          </Tooltip>
                                          <div className="w-px h-4 bg-gray-200"></div>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md"
                                                asChild
                                              >
                                                <Link to={`/dashboard/${communitySlug}/attenders?eventId=${event.id}`}>
                                                  <Users className="w-4 h-4" />
                                                </Link>
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View participants</TooltipContent>
                                          </Tooltip>
                                        </>
                                      ) : (
                                        <DropdownMenu>
                                          <Tooltip>
                                          <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md"
                                              >
                                                <MoreHorizontal className="w-4 h-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                          </TooltipTrigger>
                                          <TooltipContent>More actions</TooltipContent>
                                        </Tooltip>
                                          <DropdownMenuContent align="end" className="w-48">
                                            {onStatusChange && (
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  onStatusChange(
                                                    event.id,
                                                    event.status === 'published' ? 'draft' : 'published'
                                                  )
                                                }
                                              >
                                                {event.status === 'published' ? (
                                                  <>
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Move to Drafts
                                                  </>
                                                ) : (
                                                  <>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Publish Event
                                                  </>
                                                )}
                                              </DropdownMenuItem>
                                            )}
                                            {onStatusChange && <DropdownMenuSeparator />}
                                            <DropdownMenuItem asChild>
                                              <Link
                                                to={
                                                  isExternal
                                                    ? `/dashboard/${communitySlug}/events/${event.id}/edit-external`
                                                    : `/dashboard/${communitySlug}/events/${event.id}/edit`
                                                }
                                              >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit Details
                                              </Link>
                                            </DropdownMenuItem>
                                            {!isExternal && (
                                              <DropdownMenuItem asChild>
                                                <Link
                                                  to={`/dashboard/${communitySlug}/attenders?eventId=${event.id}`}
                                                >
                                                  <Users className="w-4 h-4 mr-2" />
                                                  Manage Guests
                                                </Link>
                                              </DropdownMenuItem>
                                            )}
                                            {isExternal && event.external_registration_url && (
                                              <DropdownMenuItem asChild>
                                                <a
                                                  href={event.external_registration_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  <ExternalLink className="w-4 h-4 mr-2" />
                                                  Go to event page
                                                </a>
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem asChild>
                                              <Link
                                                to={`/dashboard/${communitySlug}/events/${event.id}/statistics`}
                                              >
                                                <BarChart3 className="w-4 h-4 mr-2" />
                                                View Analytics
                                              </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                              onClick={() => onDelete?.(event.id)}
                                            >
                                              <Trash2 className="w-4 h-4 mr-2" />
                                              Delete Event
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }),
                ];
              });
            })()}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No events found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {events.length === 0
                ? 'Get started by creating your first event'
                : 'Try adjusting your filters'}
          </p>
          {events.length === 0 && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link to={`/dashboard/${communitySlug}/events/create`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Luhive Event
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/dashboard/${communitySlug}/events/create-external`}>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Create Link Event
                  </Link>
                </Button>
              </div>
          )}
        </div>
      )}
    </div>
  );
}
