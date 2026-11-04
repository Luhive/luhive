-- Enforce a hackathon's max team size in the database. The app checks it too,
-- but two people joining (or a captain inviting) at the same moment could both
-- pass that check. The trigger locks the team row, so inserts for one team run
-- one at a time and each sees the others' rows.
--
-- Members count against the limit on their own. Invites count members plus
-- open invites, matching what the captain's sheet shows.

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

  SELECT count(*) INTO taken
  FROM public.event_team_members
  WHERE team_id = NEW.team_id;

  IF TG_TABLE_NAME = 'event_team_invites' THEN
    taken := taken + (
      SELECT count(*) FROM public.event_team_invites WHERE team_id = NEW.team_id
    );
  END IF;

  IF taken >= max_size THEN
    RAISE EXCEPTION 'hackathon_team_full' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_hackathon_team_size() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER event_team_members_size_guard
  BEFORE INSERT ON public.event_team_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hackathon_team_size();

CREATE TRIGGER event_team_invites_size_guard
  BEFORE INSERT ON public.event_team_invites
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hackathon_team_size();
