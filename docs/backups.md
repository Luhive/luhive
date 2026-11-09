# Backups

The database is backed up by Supabase Pro: daily, kept 7 days, restored from
Database → Backups in the dashboard. Those backups include `storage.objects`
metadata but not the files themselves.

Storage files are mirrored to Cloudflare R2 every night by
`.github/workflows/backup.yml`.

```
r2://<R2_BUCKET>/
  storage/<bucket>/...                    mirror of every Storage bucket
  storage-deleted/<YYYY-MM-DD>/<bucket>/  files deleted or overwritten that day, kept 7 days
```

Edge Function secrets and project settings are not backed up; keep them in the
password manager.

## Repository secrets

| Secret | Where |
|---|---|
| `SUPABASE_PROJECT_REF` | Project ref from the dashboard URL |
| `SUPABASE_STORAGE_REGION` | Project region, e.g. `eu-central-1` |
| `SUPABASE_STORAGE_ACCESS_KEY_ID`, `SUPABASE_STORAGE_SECRET_ACCESS_KEY` | Storage → Settings → S3 access keys |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → R2 |
| `R2_BUCKET` | A private R2 bucket created for backups |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 → Manage API tokens, Object Read & Write on that bucket only |

## Restore

After restoring the database from the dashboard, put the files back:

```bash
rclone copy r2:<R2_BUCKET>/storage supa:
```

A file deleted by mistake is under `storage-deleted/<date>/<bucket>/` for 7 days:

```bash
rclone copy r2:<R2_BUCKET>/storage-deleted/<date>/<bucket>/<path> supa:<bucket>/<dir>
```

Run a restore into a throwaway project once, before it is needed.
