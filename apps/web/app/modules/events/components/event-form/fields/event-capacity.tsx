import { useState } from 'react';
import { Label } from '~/shared/components/ui/label';
import { Switch } from '~/shared/components/ui/switch';
import { Calendar } from '~/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/shared/components/ui/popover';
import { Button } from '~/shared/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/shared/components/ui/input-group';
import { CalendarIcon, Users } from 'lucide-react';
import { cn } from '~/shared/lib/utils';
import dayjs from 'dayjs';

interface EventCapacityProps {
  capacity?: number;
  registrationDeadline?: Date;
  isApproveRequired: boolean;
  isApprovalLocked?: boolean;
  approvalLockedOn?: boolean;
  onCapacityChange: (capacity: number | undefined) => void;
  onRegistrationDeadlineChange: (deadline: Date | undefined) => void;
  onIsApproveRequiredChange: (isRequired: boolean) => void;
  eventStartDate?: Date;
}

export function EventCapacity({
  capacity,
  registrationDeadline,
  isApproveRequired,
  isApprovalLocked = false,
  approvalLockedOn = false,
  onCapacityChange,
  onRegistrationDeadlineChange,
  onIsApproveRequiredChange,
  eventStartDate,
}: EventCapacityProps) {
  const [hasCapacityLimit, setHasCapacityLimit] = useState(!!capacity);
  const [hasDeadline, setHasDeadline] = useState(!!registrationDeadline);
  const [isDeadlineCalendarOpen, setIsDeadlineCalendarOpen] = useState(false);

  const handleCapacityToggle = (checked: boolean) => {
    setHasCapacityLimit(checked);
    if (!checked) {
      onCapacityChange(undefined);
    }
  };

  const handleDeadlineToggle = (checked: boolean) => {
    setHasDeadline(checked);
    if (!checked) {
      onRegistrationDeadlineChange(undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Capacity Limit */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="capacity-toggle">Capacity Limit</Label>
            <p className="text-sm text-muted-foreground">
              Set a maximum number of attendees
            </p>
          </div>
          <Switch
            id="capacity-toggle"
            checked={hasCapacityLimit}
            onCheckedChange={handleCapacityToggle}
          />
        </div>

        {hasCapacityLimit && (
          <div className="space-y-2">
            <Label htmlFor="capacity">Maximum Attendees</Label>
            <InputGroup>
              <InputGroupAddon>
                <Users className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="capacity"
                value={capacity || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  onCapacityChange(value);
                }}
                placeholder="e.g., 50"
              />
            </InputGroup>
          </div>
        )}
      </div>

      {/* Approval Required */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="approval-toggle">Require Approval</Label>
          <p className="text-sm text-muted-foreground">
            {isApprovalLocked
              ? 'Payment confirms the registration for paid events'
              : approvalLockedOn
                ? 'Hackathons approve or reject a whole team'
                : 'Manually approve or reject registration requests'}
          </p>
        </div>
        <Switch
          id="approval-toggle"
          checked={isApprovalLocked ? false : approvalLockedOn ? true : isApproveRequired}
          disabled={isApprovalLocked || approvalLockedOn}
          onCheckedChange={onIsApproveRequiredChange}
        />
      </div>

      {/* Registration Deadline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="deadline-toggle">Registration Deadline</Label>
            <p className="text-sm text-muted-foreground">
              Set a deadline for registration
            </p>
          </div>
          <Switch
            id="deadline-toggle"
            checked={hasDeadline}
            onCheckedChange={handleDeadlineToggle}
          />
        </div>

        {hasDeadline && (
          <div className="space-y-2">
            <Label htmlFor="registration-deadline">Deadline Date</Label>
            <Popover open={isDeadlineCalendarOpen} onOpenChange={setIsDeadlineCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !registrationDeadline && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {registrationDeadline
                    ? dayjs(registrationDeadline).format('MMMM D, YYYY')
                    : 'Pick a deadline'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={registrationDeadline}
                  onSelect={(date) => {
                    onRegistrationDeadlineChange(date);
                    setIsDeadlineCalendarOpen(false);
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Can't be before today
                    if (date < today) return true;
                    
                    // Can't be after event start date
                    if (eventStartDate) {
                      const eventDate = new Date(eventStartDate);
                      eventDate.setHours(0, 0, 0, 0);
                      return date >= eventDate;
                    }
                    
                    return false;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Registration will close on this date at midnight
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

