import { Label } from '~/shared/components/ui/label';
import { Input } from '~/shared/components/ui/input';
import { Textarea } from '~/shared/components/ui/textarea';
import { DescriptionExpandDialog } from './description-expand-dialog';

interface EventBasicInfoProps {
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function EventBasicInfo({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: EventBasicInfoProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Title */}
      <div className="shrink-0 space-y-2">
        <Label htmlFor="event-title">Event Title *</Label>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Monthly Community Meetup"
          required
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          {title.length}/200 characters
        </p>
      </div>

      {/* Description */}
      <div className="flex min-h-0 flex-1 flex-col space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="event-description">Description</Label>
          <DescriptionExpandDialog
            value={description}
            onChange={onDescriptionChange}
            maxLength={2000}
            placeholder="Tell attendees what this event is about..."
          />
        </div>
        <Textarea
          id="event-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Tell attendees what this event is about..."
          className="min-h-30 max-h-[60vh] flex-1 resize-none overflow-y-auto lg:max-h-none lg:min-h-0 lg:field-sizing-fixed"
          maxLength={2000}
        />
        <p className="shrink-0 text-xs text-muted-foreground">
          {description.length}/2000 characters
        </p>
      </div>
    </div>
  );
}

