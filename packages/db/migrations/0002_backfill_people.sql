-- Stage 1 #5b: fill people from existing members and registrations, and
-- import the history those rows already imply.
--
-- Re-runnable. Lookup is (community_id, email). If an account later changes
-- email, a re-run can collide on (community_id, external_id); upsertPerson
-- in #6 looks up external_id first and is the durable fix.
--
-- A registration's tenant is events.community_id, not
-- registration_source_community_id (that is only where they clicked from).
-- profiles has no email; it lives in auth.users.

WITH source AS (
  SELECT
    cm.community_id,
    cm.user_id::text AS external_id,
    NULLIF(LOWER(TRIM(u.email)), '') AS email,
    NULLIF(BTRIM(p.full_name), '') AS name,
    (cm.joined_at AT TIME ZONE 'UTC') AS seen_at,
    CASE WHEN cm.email_opt_out THEN now() END AS unsubscribed_at
  FROM public.community_members cm
  JOIN auth.users u ON u.id = cm.user_id
  LEFT JOIN public.profiles p ON p.id = cm.user_id
  WHERE cm.community_id IS NOT NULL

  UNION ALL

  SELECT
    e.community_id,
    er.user_id::text AS external_id,
    NULLIF(LOWER(TRIM(COALESCE(u.email, er.anonymous_email))), '') AS email,
    NULLIF(BTRIM(COALESCE(p.full_name, er.anonymous_name)), '') AS name,
    er.registered_at AS seen_at,
    NULL::timestamptz AS unsubscribed_at
  FROM public.event_registrations er
  JOIN public.events e ON e.id = er.event_id
  LEFT JOIN auth.users u ON u.id = er.user_id
  LEFT JOIN public.profiles p ON p.id = er.user_id
),
merged AS (
  SELECT
    community_id,
    email,
    MAX(external_id) AS external_id,
    (ARRAY_AGG(name) FILTER (WHERE name IS NOT NULL))[1] AS name,
    MIN(seen_at) AS created_at,
    MAX(seen_at) AS last_seen_at,
    MIN(unsubscribed_at) AS unsubscribed_at
  FROM source
  WHERE email IS NOT NULL
  GROUP BY community_id, email
)
INSERT INTO public.people (
  community_id,
  external_id,
  email,
  name,
  created_at,
  last_seen_at,
  unsubscribed_at
)
SELECT
  community_id,
  external_id,
  email,
  name,
  COALESCE(created_at, now()),
  last_seen_at,
  unsubscribed_at
FROM merged
ON CONFLICT (community_id, email) DO UPDATE SET
  external_id = COALESCE(public.people.external_id, EXCLUDED.external_id),
  name = COALESCE(public.people.name, EXCLUDED.name),
  created_at = LEAST(public.people.created_at, EXCLUDED.created_at),
  last_seen_at = CASE
    WHEN public.people.last_seen_at IS NULL THEN EXCLUDED.last_seen_at
    WHEN EXCLUDED.last_seen_at IS NULL THEN public.people.last_seen_at
    ELSE GREATEST(public.people.last_seen_at, EXCLUDED.last_seen_at)
  END,
  unsubscribed_at = COALESCE(public.people.unsubscribed_at, EXCLUDED.unsubscribed_at);

-- Members or registrants with no email are still people. They cannot share
-- the (community_id, email) upsert, so they go in by external_id.
INSERT INTO public.people (
  community_id,
  external_id,
  email,
  name,
  created_at,
  last_seen_at
)
SELECT
  cm.community_id,
  cm.user_id::text,
  NULL,
  NULLIF(BTRIM(p.full_name), ''),
  COALESCE(cm.joined_at AT TIME ZONE 'UTC', now()),
  cm.joined_at AT TIME ZONE 'UTC'
FROM public.community_members cm
LEFT JOIN public.profiles p ON p.id = cm.user_id
LEFT JOIN auth.users u ON u.id = cm.user_id
WHERE cm.community_id IS NOT NULL
  AND cm.user_id IS NOT NULL
  AND NULLIF(LOWER(TRIM(u.email)), '') IS NULL
ON CONFLICT (community_id, external_id) DO UPDATE SET
  name = COALESCE(public.people.name, EXCLUDED.name),
  created_at = LEAST(public.people.created_at, EXCLUDED.created_at);

INSERT INTO public.person_events (
  id,
  person_id,
  community_id,
  type,
  occurred_at,
  properties
)
SELECT
  md5('community_joined:' || cm.id::text)::uuid,
  pe.id,
  cm.community_id,
  'community_joined',
  COALESCE(cm.joined_at AT TIME ZONE 'UTC', now()),
  '{}'::jsonb
FROM public.community_members cm
JOIN public.people pe
  ON pe.community_id = cm.community_id
 AND pe.external_id = cm.user_id::text
WHERE cm.community_id IS NOT NULL
  AND cm.user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.person_events (
  id,
  person_id,
  community_id,
  type,
  occurred_at,
  properties
)
SELECT
  md5('event_registered:' || er.id::text)::uuid,
  pe.id,
  e.community_id,
  'event_registered',
  COALESCE(er.registered_at, now()),
  jsonb_build_object('event_id', er.event_id)
FROM public.event_registrations er
JOIN public.events e ON e.id = er.event_id
JOIN public.people pe
  ON pe.community_id = e.community_id
 AND (
   (er.user_id IS NOT NULL AND pe.external_id = er.user_id::text)
   OR (
     er.user_id IS NULL
     AND pe.email = NULLIF(LOWER(TRIM(er.anonymous_email)), '')
   )
 )
ON CONFLICT (id) DO NOTHING;
