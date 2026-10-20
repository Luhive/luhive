-- Manual payment provider: the organiser collects the money (for example card
-- to card) and confirms it with "Mark as paid". The provider itself is chosen
-- per community in communities.settings.payments.provider.

-- Orders remember which provider they were created for, so a community that
-- switches provider keeps a correct history.
ALTER TABLE public.ticket_orders
  ADD COLUMN payment_provider text DEFAULT 'checkila' NOT NULL,
  ADD CONSTRAINT ticket_orders_payment_provider_check
    CHECK (payment_provider IN ('checkila', 'manual'));

-- How to pay a manual event (card number, name on card). Not a column on
-- events: published events are readable by anyone with the anon key, and this
-- text is meant only for people who registered.
CREATE TABLE public.event_payment_instructions (
    event_id uuid NOT NULL,
    instructions text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_payment_instructions_pkey PRIMARY KEY (event_id),
    CONSTRAINT event_payment_instructions_not_blank
      CHECK (length(btrim(instructions)) > 0)
);

ALTER TABLE ONLY public.event_payment_instructions
  ADD CONSTRAINT event_payment_instructions_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Service-role only, same as ticket_orders.
ALTER TABLE public.event_payment_instructions DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_payment_instructions
  FROM PUBLIC, anon, authenticated;
