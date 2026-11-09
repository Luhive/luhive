-- One certificate per person per hackathon. Issued by a script from the
-- organizer's rankings (docs/hackathon-certificates.md). Name, team, award and
-- event details are copied at issue time, so later edits or a deleted
-- registration never change a published certificate. `code` is the public link.

CREATE TABLE public.event_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    event_id uuid NOT NULL,
    registration_id uuid,
    user_id uuid,
    recipient_email text NOT NULL,
    recipient_name text NOT NULL,
    team_name text NOT NULL,
    award text NOT NULL,
    event_title text NOT NULL,
    event_date date NOT NULL,
    community_name text NOT NULL,
    community_slug text NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    emailed_at timestamp with time zone,
    revoked_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_certificates_pkey PRIMARY KEY (id),
    CONSTRAINT event_certificates_code_key UNIQUE (code),
    CONSTRAINT event_certificates_event_registration_key UNIQUE (event_id, registration_id),
    CONSTRAINT event_certificates_award_check
      CHECK (award IN ('place_1', 'place_2', 'place_3', 'participant')),
    CONSTRAINT event_certificates_email_lower
      CHECK (recipient_email = lower(btrim(recipient_email)) AND position('@' IN recipient_email) > 1),
    CONSTRAINT event_certificates_code_format CHECK (code ~ '^[a-z0-9]{10}$')
);

COMMENT ON TABLE public.event_certificates IS
  'Hackathon certificates, one per person per event. Text is frozen at issue time; code is the public link.';

ALTER TABLE ONLY public.event_certificates
  ADD CONSTRAINT event_certificates_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_certificates
  ADD CONSTRAINT event_certificates_registration_id_fkey
  FOREIGN KEY (registration_id) REFERENCES public.event_registrations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.event_certificates
  ADD CONSTRAINT event_certificates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX event_certificates_user_id_idx
  ON public.event_certificates (user_id) WHERE user_id IS NOT NULL;

-- Profile load links certificates issued before the person had an account.
CREATE INDEX event_certificates_unlinked_email_idx
  ON public.event_certificates (recipient_email) WHERE user_id IS NULL;

ALTER TABLE public.event_certificates DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.event_certificates FROM PUBLIC, anon, authenticated;
