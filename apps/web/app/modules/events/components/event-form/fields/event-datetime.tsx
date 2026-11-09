import { useState } from 'react';
import { Calendar } from '~/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/shared/components/ui/popover';
import { Button } from '~/shared/components/ui/button';
import { Label } from '~/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/shared/components/ui/select';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/shared/components/ui/input-group';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '~/shared/lib/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface EventDateTimeProps {
  startDate?: Date;
  startTime?: string;
  endDate?: Date;
  endTime?: string;
  /** True when the end date/time is not after the start; shows an inline error. */
  endsBeforeStart?: boolean;
  timezone?: string;
  onStartDateChange: (date: Date | undefined) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onEndTimeChange: (time: string) => void;
  onTimezoneChange: (tz: string) => void;
}

// Common timezones
const TIMEZONES = [
  { value: 'Asia/Baku', label: 'Asia/Baku (GMT+4)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (GMT+1)' },
  { value: 'Europe/Istanbul', label: 'Europe/Istanbul (GMT+3)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (GMT+5:30)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (GMT+11)' },
  { value: 'America/New_York', label: 'America/New_York (GMT-5)' },
  { value: 'America/Chicago', label: 'America/Chicago (GMT-6)' },
  { value: 'America/Denver', label: 'America/Denver (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (GMT+13)' },
];

/** New end date after the start moves, keeping the same number of days between them. */
export function carryEndDate(prevStart: Date | undefined, prevEnd: Date | undefined, nextStart: Date | undefined) {
  if (!nextStart || !prevStart || !prevEnd) return nextStart;
  const spanDays = dayjs(prevEnd).startOf('day').diff(dayjs(prevStart).startOf('day'), 'day');
  return dayjs(nextStart).add(Math.max(spanDays, 0), 'day').toDate();
}

/** True when end (date + time) is not after start. Times are "HH:mm", so string order is time order. */
export function isEndBeforeStart(startDate?: Date, startTime?: string, endDate?: Date, endTime?: string) {
  if (!startDate || !endDate || !startTime || !endTime) return false;
  const at = (d: Date, t: string) => `${dayjs(d).format('YYYY-MM-DD')}T${t}`;
  return at(endDate, endTime) <= at(startDate, startTime);
}

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));

interface DatePickerButtonProps {
  id: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  isDisabled: (date: Date) => boolean;
  invalid?: boolean;
}

function DatePickerButton({ id, value, onChange, isDisabled, invalid }: DatePickerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid || undefined}
          className={cn(
            'h-11 w-full min-w-0 justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {value ? dayjs(value).format('ddd, MMM D, YYYY') : 'Pick a date'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(date) => {
            if (date) onChange(date);
            setOpen(false);
          }}
          disabled={isDisabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface TimeInputProps {
  id: string;
  value: string;
  onChange: (time: string) => void;
  required?: boolean;
  invalid?: boolean;
}

function TimeInput({ id, value, onChange, required, invalid }: TimeInputProps) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <Clock className="h-4 w-4" />
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={invalid || undefined}
      />
    </InputGroup>
  );
}

export function EventDateTime({
  startDate,
  startTime = '09:00',
  endDate,
  endTime = '10:00',
  endsBeforeStart = false,
  timezone: selectedTimezone = 'Asia/Baku',
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  onTimezoneChange,
}: EventDateTimeProps) {
  return (
    <div className="space-y-4">
      {/* Start */}
      <div className="space-y-2">
        <Label htmlFor="start-date">Start *</Label>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-3">
          <DatePickerButton
            id="start-date"
            value={startDate}
            onChange={onStartDateChange}
            isDisabled={(date) => date < startOfToday()}
          />
          <TimeInput id="start-time" value={startTime} onChange={onStartTimeChange} required />
        </div>
      </div>

      {/* End: defaults to the start date, editable for multi-day events */}
      <div className="space-y-2">
        <Label htmlFor="end-date">End</Label>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-3">
          <DatePickerButton
            id="end-date"
            value={endDate}
            onChange={onEndDateChange}
            isDisabled={(date) => date < (startDate ? dayjs(startDate).startOf('day').toDate() : startOfToday())}
            invalid={endsBeforeStart}
          />
          <TimeInput id="end-time" value={endTime} onChange={onEndTimeChange} invalid={endsBeforeStart} />
        </div>
        {endsBeforeStart && (
          <p className="text-xs text-destructive">The event must end after it starts.</p>
        )}
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone *</Label>
        <Select value={selectedTimezone} onValueChange={onTimezoneChange}>
          <SelectTrigger id="timezone">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
