-- Lite hackathon mode: a native event can collect teams. Submissions stay
-- outside Luhive. Scoping lives in application code, same as ticket_orders.

ALTER TABLE public.events
  ADD COLUMN is_hackathon boolean DEFAULT false NOT NULL,
  ADD COLUMN max_team_size integer,
  ADD CONSTRAINT events_max_team_size_positive
    CHECK (max_team_size IS NULL OR max_team_size > 0);

COMMENT ON COLUMN public.events.is_hackathon IS
  'When true, people register onto a team. Require-approval is forced on.';
COMMENT ON COLUMN public.events.max_team_size IS
  'Optional cap on people per team. NULL means no cap.';

CREATE TABLE public.event_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    join_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_teams_pkey PRIMARY KEY (id),
    CONSTRAINT event_teams_join_code_key UNIQUE (join_code),
    CONSTRAINT event_teams_name_length
      CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
    CONSTRAINT event_teams_description_length
      CHECK (char_length(btrim(description)) BETWEEN 1 AND 400),
    CONSTRAINT event_teams_join_code_length
      CHECK (char_length(join_code) >= 16)
);

COMMENT ON TABLE public.event_teams IS
  'One hackathon team. join_code is the unguessable path segment of the private join link.';

CREATE INDEX event_teams_event_id_idx ON public.event_teams (event_id);

ALTER TABLE ONLY public.event_teams
  ADD CONSTRAINT event_teams_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

CREATE TABLE public.event_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    registration_id uuid NOT NULL,
    role text NOT NULL,
    given_name text NOT NULL,
    family_name text NOT NULL,
    linkedin_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_team_members_pkey PRIMARY KEY (id),
    CONSTRAINT event_team_members_registration_id_key UNIQUE (registration_id),
    CONSTRAINT event_team_members_role_check
      CHECK (role IN ('captain', 'member')),
    CONSTRAINT event_team_members_given_name_length
      CHECK (char_length(btrim(given_name)) BETWEEN 1 AND 80),
    CONSTRAINT event_team_members_family_name_length
      CHECK (char_length(btrim(family_name)) BETWEEN 1 AND 80),
    CONSTRAINT event_team_members_linkedin_url_check
      CHECK (linkedin_url LIKE 'https://%')
);

COMMENT ON TABLE public.event_team_members IS
  'A registration belongs to at most one team. Deleting the registration removes the membership.';

CREATE UNIQUE INDEX event_team_members_one_captain_idx
  ON public.event_team_members (team_id)
  WHERE role = 'captain';

CREATE INDEX event_team_members_team_id_idx
  ON public.event_team_members (team_id);

ALTER TABLE ONLY public.event_team_members
  ADD CONSTRAINT event_team_members_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.event_teams(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_team_members
  ADD CONSTRAINT event_team_members_registration_id_fkey
  FOREIGN KEY (registration_id) REFERENCES public.event_registrations(id) ON DELETE CASCADE;

ALTER TABLE public.event_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_team_members DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.event_teams FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.event_team_members FROM PUBLIC, anon, authenticated;
