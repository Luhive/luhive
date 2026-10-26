-- Mobile app waitlist behind /app. One row per person: logged-out visitors by
-- email, logged-in users by account (their account email is stored too, so the
-- two paths dedupe against each other). Spec: docs/mobile-app-waitlist.md.

CREATE TABLE public.mobile_app_waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    user_id uuid,
    first_feature text,
    utm_source text DEFAULT 'direct' NOT NULL,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    welcome_sent_at timestamp with time zone,
    resend_contact_id text,
    unsubscribed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mobile_app_waitlist_pkey PRIMARY KEY (id),
    CONSTRAINT mobile_app_waitlist_email_key UNIQUE (email),
    -- Stored normalised so the unique constraint is case-insensitive.
    CONSTRAINT mobile_app_waitlist_email_normalised
      CHECK (email = lower(btrim(email)) AND email <> ''),
    CONSTRAINT mobile_app_waitlist_first_feature_check
      CHECK (first_feature IS NULL OR first_feature IN
        ('event_notifications', 'qr_tickets', 'discover_events'))
);

COMMENT ON TABLE public.mobile_app_waitlist IS
  'Signups for the upcoming mobile apps. utm_* is the first touch and is not overwritten when a person signs up again.';
COMMENT ON COLUMN public.mobile_app_waitlist.unsubscribed_at IS
  'Set from the Resend contact.updated webhook when the person unsubscribes from the weekly email.';

CREATE UNIQUE INDEX mobile_app_waitlist_user_id_key
  ON public.mobile_app_waitlist (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE ONLY public.mobile_app_waitlist
  ADD CONSTRAINT mobile_app_waitlist_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Written by the web app's service-role client only, same as ticket_orders.
ALTER TABLE public.mobile_app_waitlist DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mobile_app_waitlist FROM PUBLIC, anon, authenticated;
