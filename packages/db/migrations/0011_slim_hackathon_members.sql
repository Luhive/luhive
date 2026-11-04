-- A team member is a registration on a team. Name and LinkedIn stay on the registration.

ALTER TABLE public.event_team_members
  DROP COLUMN given_name,
  DROP COLUMN family_name,
  DROP COLUMN linkedin_url;
