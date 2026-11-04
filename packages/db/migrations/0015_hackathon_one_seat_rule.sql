-- One seat rule for hackathon teams: a seat is a member or an open invite.
-- 0014 counted only members when someone joined, so a team could show
-- "4 of 3" once open invites were added. Now joining counts invites too. The
-- app deletes the joiner's own invite before adding them, so their invite
-- seat becomes their member seat.

CREATE OR REPLACE FUNCTION public.enforce_hackathon_team_size()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  max_size integer;
  taken integer;
BEGIN
  SELECT e.max_team_size INTO max_size
  FROM public.event_teams t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.id = NEW.team_id
  FOR UPDATE OF t;

  IF max_size IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    (SELECT count(*) FROM public.event_team_members WHERE team_id = NEW.team_id)
    + (SELECT count(*) FROM public.event_team_invites WHERE team_id = NEW.team_id)
  INTO taken;

  IF taken >= max_size THEN
    RAISE EXCEPTION 'hackathon_team_full' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
