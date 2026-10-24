-- Profile activity grid: one row per day with activity for the signed-in user,
-- over the 52 weeks ending today. Computed on read from the source tables; every
-- branch is driven by an index on the user's own rows, so cost scales with one
-- person's history, not with the database.

CREATE INDEX IF NOT EXISTS idx_announcement_views_user_announcement
  ON public.announcement_views (user_id, announcement_id, created_at)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_created_by
  ON public.community_announcements (created_by, created_at);

CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON public.events (created_by, created_at);

CREATE INDEX IF NOT EXISTS idx_events_community_start_published
  ON public.events (community_id, start_time)
  WHERE status = 'published';

CREATE OR REPLACE FUNCTION public.profile_activity(p_tz text DEFAULT 'Asia/Baku')
RETURNS TABLE (
  day date,
  hosted integer,
  attended integer,
  registered integer,
  events_created integer,
  updates_sent integer,
  updates_opened integer,
  communities_joined integer,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH me AS (
  SELECT auth.uid() AS id
),
bounds AS (
  SELECT
    first_day,
    (first_day::timestamp AT TIME ZONE p_tz) AS from_ts,
    now() AS to_ts
  FROM (
    SELECT (date_trunc('week', (now() AT TIME ZONE p_tz)::date) - interval '51 weeks')::date AS first_day
  ) w
),
managed AS (
  SELECT cm.community_id AS id
  FROM community_members cm, me
  WHERE cm.user_id = me.id AND cm.role IN ('owner', 'admin')
  UNION
  SELECT c.id
  FROM communities c, me
  WHERE c.created_by = me.id
),
hosted_events AS (
  SELECT e.id, e.title, e.start_time
  FROM events e
  JOIN managed m ON m.id = e.community_id
  CROSS JOIN bounds b
  WHERE e.status = 'published'
    AND e.start_time >= b.from_ts AND e.start_time <= b.to_ts
  UNION
  SELECT e.id, e.title, e.start_time
  FROM event_collaborations ec
  JOIN managed m ON m.id = ec.community_id
  JOIN events e ON e.id = ec.event_id
  CROSS JOIN bounds b
  WHERE ec.status = 'accepted'
    AND e.status = 'published'
    AND e.start_time >= b.from_ts AND e.start_time <= b.to_ts
),
items AS (
  SELECT h.start_time AS at, 'hosted'::text AS kind, h.title
  FROM hosted_events h

  UNION ALL
  SELECT DISTINCT ON (e.id) e.start_time, 'attended', e.title
  FROM event_registrations r
  JOIN events e ON e.id = r.event_id
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE r.user_id = me.id
    AND r.rsvp_status <> 'not_going'
    AND (coalesce(r.approval_status, 'approved') = 'approved' OR r.is_attended)
    AND e.status = 'published'
    AND e.start_time >= b.from_ts AND e.start_time <= b.to_ts
    AND NOT EXISTS (SELECT 1 FROM hosted_events h WHERE h.id = e.id)

  UNION ALL
  SELECT r.registered_at, 'registered', e.title
  FROM event_registrations r
  JOIN events e ON e.id = r.event_id
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE r.user_id = me.id
    AND r.rsvp_status <> 'not_going'
    AND r.registered_at >= b.from_ts
    AND NOT EXISTS (SELECT 1 FROM managed m WHERE m.id = e.community_id)

  UNION ALL
  SELECT e.created_at, 'events_created', e.title
  FROM events e
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE e.created_by = me.id
    AND e.status = 'published'
    AND e.created_at >= b.from_ts

  UNION ALL
  SELECT coalesce(a.email_sent_at, a.created_at), 'updates_sent', a.title
  FROM community_announcements a
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE a.created_by = me.id
    AND a.published
    AND coalesce(a.email_sent_at, a.created_at) >= b.from_ts

  UNION ALL
  SELECT f.first_open, 'updates_opened', a.title
  FROM (
    SELECT v.announcement_id, min(v.created_at) AS first_open
    FROM announcement_views v, me
    WHERE v.user_id = me.id
    GROUP BY v.announcement_id
  ) f
  JOIN community_announcements a ON a.id = f.announcement_id
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE f.first_open >= b.from_ts
    AND a.created_by <> me.id

  UNION ALL
  SELECT cm.joined_at AT TIME ZONE 'UTC', 'communities_joined', c.name
  FROM community_members cm
  JOIN communities c ON c.id = cm.community_id
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE cm.user_id = me.id
    AND cm.joined_at >= (b.from_ts AT TIME ZONE 'UTC')
),
ranked AS (
  SELECT
    (i.at AT TIME ZONE p_tz)::date AS day,
    i.kind,
    i.title,
    i.at,
    row_number() OVER (
      PARTITION BY (i.at AT TIME ZONE p_tz)::date
      ORDER BY (i.kind IN ('hosted', 'attended')) DESC, i.at
    ) AS rank
  FROM items i
)
SELECT
  r.day,
  count(*) FILTER (WHERE r.kind = 'hosted')::integer,
  count(*) FILTER (WHERE r.kind = 'attended')::integer,
  count(*) FILTER (WHERE r.kind = 'registered')::integer,
  count(*) FILTER (WHERE r.kind = 'events_created')::integer,
  count(*) FILTER (WHERE r.kind = 'updates_sent')::integer,
  count(*) FILTER (WHERE r.kind = 'updates_opened')::integer,
  count(*) FILTER (WHERE r.kind = 'communities_joined')::integer,
  coalesce(
    jsonb_agg(jsonb_build_object('kind', r.kind, 'title', r.title) ORDER BY r.rank)
      FILTER (WHERE r.rank <= 6),
    '[]'::jsonb
  )
FROM ranked r
GROUP BY r.day
ORDER BY r.day;
$$;

COMMENT ON FUNCTION public.profile_activity(text) IS
  'Daily activity for auth.uid() over the 52 weeks ending today, bucketed in p_tz. Sparse: days without activity are omitted. items holds at most 6 titled entries per day, events first; the counts are exact.';

REVOKE ALL ON FUNCTION public.profile_activity(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_activity(text) TO authenticated, service_role;
