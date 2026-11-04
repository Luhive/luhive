-- Captains invite teammates by email only. The teammate enters their own name
-- when they join, so the invite does not need one.

ALTER TABLE public.event_team_invites
  DROP CONSTRAINT event_team_invites_name_length,
  DROP COLUMN name;
