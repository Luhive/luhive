#!/usr/bin/env bash
# Read-only database checks. Every query runs inside BEGIN READ ONLY … ROLLBACK
# (the pooler ignores startup options, so PGOPTIONS can't do it).
#
#   pnpm test-db team <event-slug>      teams, members, invites, people without a team
#   pnpm test-db person <email>         that person's registrations and team for every event
#   pnpm test-db sql "select …"         any single read-only SELECT
#
# `pnpm test-db` uses the TEST database (VALIDATION_DATABASE_URL).
# `pnpm prod-db` runs the same commands on PRODUCTION, read-only. For people only:
# agents never run prod-db.
set -euo pipefail

VAR=VALIDATION_DATABASE_URL
if [[ "${1:-}" == "--prod" ]]; then
  VAR=PRODUCTION_DATABASE_URL
  shift
  echo "— production database, read-only" >&2
fi

ENV_FILE="$(cd "$(dirname "$0")/../../../packages/db" && pwd)/.env"
URL="$(grep -E "^${VAR}=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]$//")"
if [[ -z "$URL" ]]; then
  echo "✗ ${VAR} is missing in packages/db/.env" >&2
  exit 1
fi

# Reads SQL on stdin and runs it in a read-only transaction that is rolled back.
run() {
  { echo "begin read only;"; cat; echo; echo "rollback;"; } |
    psql "$URL" -X -q -P pager=off -v ON_ERROR_STOP=1 "$@"
}

case "${1:-}" in
  team)
    [[ -n "${2:-}" ]] || { echo "Usage: pnpm test-db team <event-slug>" >&2; exit 1; }
    run -v slug="$2" <<'SQL'
\echo '== Event'
select e.id, e.title, e.slug, e.status, e.is_hackathon, e.max_team_size, e.is_approve_required
from events e where e.slug = :'slug' or e.id::text = :'slug';
\echo '== Teams and members'
select t.name as team, t.join_code, m.role, p.full_name, u.email, r.approval_status, r.checkin_token is not null as has_checkin
from event_teams t
join events e on e.id = t.event_id
left join event_team_members m on m.team_id = t.id
left join event_registrations r on r.id = m.registration_id
left join profiles p on p.id = r.user_id
left join auth.users u on u.id = r.user_id
where e.slug = :'slug' or e.id::text = :'slug'
order by t.created_at, m.role, m.created_at;
\echo '== Open invites'
select t.name as team, i.email, i.created_at
from event_team_invites i
join event_teams t on t.id = i.team_id
join events e on e.id = t.event_id
where e.slug = :'slug' or e.id::text = :'slug'
order by t.created_at, i.created_at;
\echo '== Registrations without a team (should be empty)'
select u.email, p.full_name, r.approval_status, r.registered_at
from event_registrations r
join events e on e.id = r.event_id
left join event_team_members m on m.registration_id = r.id
left join profiles p on p.id = r.user_id
left join auth.users u on u.id = r.user_id
where (e.slug = :'slug' or e.id::text = :'slug') and m.id is null;
SQL
    ;;
  person)
    [[ -n "${2:-}" ]] || { echo "Usage: pnpm test-db person <email>" >&2; exit 1; }
    run -v email="$2" <<'SQL'
select u.id as user_id, u.email, p.full_name, p.metadata->'social_links'->>'linkedin' as linkedin
from auth.users u left join profiles p on p.id = u.id
where lower(u.email) = lower(:'email');
select e.slug as event, r.approval_status, t.name as team, m.role, r.registered_at
from event_registrations r
join auth.users u on u.id = r.user_id
join events e on e.id = r.event_id
left join event_team_members m on m.registration_id = r.id
left join event_teams t on t.id = m.team_id
where lower(u.email) = lower(:'email')
order by r.registered_at desc;
SQL
    ;;
  sql)
    [[ -n "${2:-}" ]] || { echo 'Usage: pnpm test-db sql "select …"' >&2; exit 1; }
    if ! grep -qiE '^[[:space:]]*(select|with)[[:space:]]' <<<"$2" ||
      [[ "$2" == *";"* ]]; then
      echo "✗ Only a single read-only SELECT is allowed." >&2
      exit 1
    fi
    run <<<"$2;"
    ;;
  *)
    echo 'Usage: pnpm test-db <team <event-slug> | person <email> | sql "select …">' >&2
    exit 1
    ;;
esac
