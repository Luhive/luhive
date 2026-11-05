-- The owner invites someone by email to be a community admin. The row is the
-- pending invite; its id is the link token. It is deleted on accept or revoke.

CREATE TABLE public.community_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    invited_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT community_invites_pkey PRIMARY KEY (id),
    CONSTRAINT community_invites_community_email_key UNIQUE (community_id, email),
    CONSTRAINT community_invites_role_check CHECK (role = 'admin'),
    CONSTRAINT community_invites_email_lower
      CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1)
);

COMMENT ON TABLE public.community_invites IS
  'People the owner invited by email to a community role who have not accepted yet.';

ALTER TABLE ONLY public.community_invites
  ADD CONSTRAINT community_invites_community_id_fkey
  FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.community_invites
  ADD CONSTRAINT community_invites_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.community_invites DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.community_invites FROM PUBLIC, anon, authenticated;
