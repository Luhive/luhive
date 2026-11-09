#!/usr/bin/env bash
# Read-only hackathon team statistics for one event
# (defaults to the hackathon below). Every query runs inside
# BEGIN READ ONLY … ROLLBACK (the pooler ignores startup options).
#
#   pnpm team-stats [event-slug]         TEST database (VALIDATION_DATABASE_URL)
#   pnpm prod-team-stats [event-slug]    PRODUCTION, read-only. For people only:
#                                        agents never run prod-team-stats.
#
# Teams have no status of their own; a team's status comes from its members'
# registrations:
#   accepted  every member approved
#   rejected  every member rejected
#   pending   at least one member still pending
#   mixed     approved and rejected members, none pending
set -euo pipefail

VAR=VALIDATION_DATABASE_URL
if [[ "${1:-}" == "--prod" ]]; then
  VAR=PRODUCTION_DATABASE_URL
  shift
  echo "— production database, read-only" >&2
fi

# The hackathon event; pass a slug or id to look at another one.
EVENT="${1:-08d35ef0-3b6d-401b-b94a-f4137e0f0e6d}"

ENV_FILE="$(cd "$(dirname "$0")/../../../packages/db" && pwd)/.env"
URL="$(grep -E "^${VAR}=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]$//")"
if [[ -z "$URL" ]]; then
  echo "✗ ${VAR} is missing in packages/db/.env" >&2
  exit 1
fi

# One row per team of the event; every query below starts from this.
TS="with team_stats as (
select
  t.id,
  t.name,
  count(m.id) as size,
  count(*) filter (where r.approval_status = 'approved') as approved,
  count(*) filter (where r.approval_status = 'pending') as pending,
  count(*) filter (where r.approval_status = 'rejected') as rejected,
  case
    when count(m.id) = 0 then 'empty'
    when count(*) filter (where r.approval_status = 'pending') > 0 then 'pending'
    when count(*) filter (where r.approval_status = 'approved') = count(m.id) then 'accepted'
    when count(*) filter (where r.approval_status = 'rejected') = count(m.id) then 'rejected'
    else 'mixed'
  end as status
from event_teams t
join events e on e.id = t.event_id
left join event_team_members m on m.team_id = t.id
left join event_registrations r on r.id = m.registration_id
where e.slug = :'slug' or e.id::text = :'slug'
group by t.id, t.name
)"

{ echo "begin read only;"; cat; echo; echo "rollback;"; } <<SQL |
\\echo '== Event'
select e.title, e.slug, e.max_team_size,
  (select count(*) from event_teams t where t.event_id = e.id) as teams,
  (select count(*) from event_team_members m join event_teams t on t.id = m.team_id where t.event_id = e.id) as people_on_teams
from events e
where e.slug = :'slug' or e.id::text = :'slug';

\\echo '== Teams by status'
$TS
select status, count(*) as teams, sum(size) as people
from team_stats
group by status
order by array_position(array['accepted','pending','rejected','mixed','empty'], status);

\\echo '== Teams by size'
$TS
select size as members, count(*) as teams, sum(size) as people
from team_stats
group by size
order by size desc;

\\echo '== Size × status (team counts)'
$TS
select
  coalesce(size::text, 'all') as members,
  count(*) filter (where status = 'accepted') as accepted,
  count(*) filter (where status = 'pending') as pending,
  count(*) filter (where status = 'rejected') as rejected,
  count(*) filter (where status = 'mixed') as mixed,
  count(*) as total
from team_stats
group by rollup (size)
order by size desc nulls last;

\\echo '== People by approval status (team members only)'
$TS
select sum(approved) as approved, sum(pending) as pending, sum(rejected) as rejected, sum(size) as total
from team_stats;

\\echo '== Mixed teams (approved and rejected members, review these)'
$TS
select name as team, size, approved, rejected
from team_stats
where status = 'mixed'
order by name;
SQL
  psql "$URL" -X -q -P pager=off -v ON_ERROR_STOP=1 -v slug="$EVENT"
