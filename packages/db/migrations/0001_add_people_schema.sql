-- Stage 1 #5: people spine, behavioural events, and community feature flags.
-- No customer table: the community is the tenant.

ALTER TABLE public.communities
  ADD COLUMN tracking_enabled boolean DEFAULT true NOT NULL;

ALTER TABLE public.communities
  ALTER COLUMN settings SET DEFAULT '{"features": {"requireApproval": false, "allowMemberPosts": true, "public_page": true, "join": true, "events": true, "newsletter": true}, "integrations": {}, "notifications": {"newMember": true, "eventReminders": true}}'::jsonb;

-- Existing feature keys win; the four new flags are filled in only when absent.
UPDATE public.communities
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{features}',
  '{"public_page": true, "join": true, "events": true, "newsletter": true}'::jsonb
    || COALESCE(settings -> 'features', '{}'::jsonb)
);

CREATE TABLE public.people (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    external_id text,
    email text,
    name text,
    locale text,
    plan text,
    subscription_status text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone,
    unsubscribed_at timestamp with time zone,
    deleted_at timestamp with time zone,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT people_pkey PRIMARY KEY (id),
    CONSTRAINT people_community_id_external_id_key UNIQUE (community_id, external_id),
    CONSTRAINT people_community_id_email_key UNIQUE (community_id, email)
);

COMMENT ON COLUMN public.people.deleted_at IS 'Soft delete. Rows are retired by stamping this, never removed.';

CREATE TABLE public.person_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    community_id uuid NOT NULL,
    type text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT person_events_pkey PRIMARY KEY (id)
);

CREATE INDEX person_events_person_id_occurred_at_idx
  ON public.person_events (person_id, occurred_at DESC);

-- RESTRICT, never CASCADE: deleting a tenant or a person must be a deliberate
-- act, not a side effect that silently takes the behavioural history with it.
ALTER TABLE ONLY public.people
  ADD CONSTRAINT people_community_id_fkey
  FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.person_events
  ADD CONSTRAINT person_events_person_id_fkey
  FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.person_events
  ADD CONSTRAINT person_events_community_id_fkey
  FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE RESTRICT;

-- Scoping lives in application code. Supabase's ensure_rls trigger would
-- otherwise enable RLS with no policies, and public-schema default privileges
-- would expose the tables through PostgREST to anon/authenticated.
ALTER TABLE public.people DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_events DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.people FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.person_events FROM PUBLIC, anon, authenticated;
