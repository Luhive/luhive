-- What happens to a certificate after it is issued: visitors opening its page and
-- the owner pressing a share action. Measures whether certificates spread
-- (docs/hackathon-certificates.md). No personal data: the code, the kind and where
-- the visit came from.

CREATE TABLE public.event_certificate_events (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    certificate_code text NOT NULL,
    kind text NOT NULL,
    channel text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_certificate_events_pkey PRIMARY KEY (id),
    CONSTRAINT event_certificate_events_kind_check CHECK (kind IN ('view', 'share')),
    CONSTRAINT event_certificate_events_channel_check CHECK (channel ~ '^[a-z_]{1,32}$')
);

COMMENT ON TABLE public.event_certificate_events IS
  'Certificate page views by visitors and share actions by owners, for measuring spread.';

ALTER TABLE ONLY public.event_certificate_events
  ADD CONSTRAINT event_certificate_events_code_fkey
  FOREIGN KEY (certificate_code) REFERENCES public.event_certificates(code) ON DELETE CASCADE;

CREATE INDEX event_certificate_events_code_idx
  ON public.event_certificate_events (certificate_code, kind);

ALTER TABLE public.event_certificate_events DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.event_certificate_events FROM PUBLIC, anon, authenticated;
