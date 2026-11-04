import { Minus, Plus } from "lucide-react";
import { Button } from "~/shared/components/ui/button";
import { Label } from "~/shared/components/ui/label";
import { Switch } from "~/shared/components/ui/switch";

type EventHackathonProps = {
  isHackathon: boolean;
  locked: boolean;
  maxTeamSize?: number;
  onHackathonChange: (enabled: boolean) => void;
  onMaxTeamSizeChange: (size: number | undefined) => void;
};

export function EventHackathon({
  isHackathon,
  locked,
  maxTeamSize,
  onHackathonChange,
  onMaxTeamSizeChange,
}: EventHackathonProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="hackathon-toggle">Hackathon mode</Label>
          <p className="text-sm text-muted-foreground">
            People join a team. You approve the team, not each person.
          </p>
        </div>
        <Switch
          id="hackathon-toggle"
          checked={isHackathon}
          disabled={locked}
          onCheckedChange={onHackathonChange}
        />
      </div>
      {isHackathon ? (
        <TeamSizeCounter value={maxTeamSize} onChange={onMaxTeamSizeChange} />
      ) : null}
    </div>
  );
}

function readTeamSize(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return parsed;
}

function TeamSizeCounter({
  value,
  onChange,
}: {
  value?: number;
  onChange: (size: number | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="max-team-size">Maximum team size</Label>
      <div className="flex w-fit items-center gap-1 px-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Decrease team size"
          disabled={value == null}
          onClick={() => onChange(value != null && value > 1 ? value - 1 : undefined)}
        >
          <Minus />
        </Button>
        <input
          id="max-team-size"
          inputMode="numeric"
          value={value ?? ""}
          placeholder="No limit"
          aria-label="Maximum team size"
          className="h-8 w-16 bg-transparent text-center text-sm text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(event) => onChange(readTeamSize(event.target.value))}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Increase team size"
          onClick={() => onChange(value == null ? 1 : value + 1)}
        >
          <Plus />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Leave empty if a team can be any size.
      </p>
    </div>
  );
}
