-- A captain can invite teammates by email. The invite only sends the team's
-- join link; the row is removed when that email joins the team.

CREATE TABLE public.event_team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_team_invites_pkey PRIMARY KEY (id),
    CONSTRAINT event_team_invites_team_email_key UNIQUE (team_id, email),
    CONSTRAINT event_team_invites_name_length
      CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
    CONSTRAINT event_team_invites_email_lower
      CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1)
);

COMMENT ON TABLE public.event_team_invites IS
  'Teammates a captain invited by email who have not joined yet.';

ALTER TABLE ONLY public.event_team_invites
  ADD CONSTRAINT event_team_invites_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.event_teams(id) ON DELETE CASCADE;

ALTER TABLE public.event_team_invites DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.event_team_invites FROM PUBLIC, anon, authenticated;
