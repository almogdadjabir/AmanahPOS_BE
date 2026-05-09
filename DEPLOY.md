# AmanaPOS — Production Deployment Runbook

**Last updated:** 2026-05-09

**Architecture summary:** Django 5 / DRF (`amanapos_app`, Gunicorn 4×gthread) behind Nginx, two Next.js 15 services (`amanapos_admin` on port 3001, `amanapos_landing` on port 3000), Celery worker + beat sharing the same app image, Redis 7 for broker/cache, MinIO for S3-compatible object storage. PostgreSQL lives on an external server (`DB_HOST` in `.env.prod`). All services share the `amanapos_net` bridge network. Nginx terminates SSL and routes: `amanapos.com` → landing, `api.amanapos.com` → Django, `app.amanapos.com` → admin. Django static files are served by Nginx from a named volume (`static_volume`); `collectstatic` runs automatically on every app container start via `entrypoint.sh`.

---

## Table of Contents

1. [Pre-deployment checklist](#1-pre-deployment-checklist)
2. [First-time server setup](#2-first-time-server-setup)
3. [Standard deployment](#3-standard-deployment)
4. [Backend Python changes only](#4-backend-python-changes-only-no-new-deps-no-migrations)
5. [Frontend changes only](#5-frontend-changes-only)
6. [New Python dependencies](#6-new-python-dependencies)
7. [New database migrations](#7-new-database-migrations)
8. [Nginx config changes](#8-nginx-config-changes)
9. [Environment variable changes](#9-environment-variable-changes)
10. [Rollback procedure](#10-rollback-procedure)
11. [Health checks](#11-health-checks)
12. [Operational commands](#12-operational-commands)
13. [Common errors and fixes](#13-common-errors-and-fixes)

---

## 1. Pre-deployment checklist

Run on your **local machine** before pushing to the server.

```bash
# Confirm all migrations are created (exits non-zero if any are missing)
cd backend
python manage.py makemigrations --check --dry-run

# Confirm DEBUG is False in production settings
grep -n "DEBUG" backend/config/settings/production.py
# Expected: DEBUG = False

# Confirm no stray print() statements in backend code
grep -rn "^print(" backend/apps/ --include="*.py"

# Confirm requirements files are up to date
pip check  # or review manually after pip install

# Build admin locally to catch TS/build errors
cd admin && npm run build

# Build landing locally
cd ../landing_page && npm run build
```

**Before pushing, verify these `.env.prod` values are correct on the server:**

| Variable | Expected value |
|---|---|
| `ALLOWED_HOSTS` | `amanapos.com,www.amanapos.com,api.amanapos.com,app.amanapos.com` |
| `CORS_ALLOWED_ORIGINS` | `https://amanapos.com,https://www.amanapos.com,https://app.amanapos.com` |
| `CSRF_TRUSTED_ORIGINS` | same as CORS |
| `MINIO_PUBLIC_URL` | `https://api.amanapos.com/storage` |
| `NEXT_PUBLIC_API_URL` | `https://api.amanapos.com` (baked into admin image at build time) |
| `DEBUG` | `False` |

---

## 2. First-time server setup

> ⚠️ Skip this entire section on subsequent deploys.

### 2.1 Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker compose version  # must be v2.x
```

### 2.2 Clone the repo

```bash
git clone <repo-url> /opt/amanapos
cd /opt/amanapos
```

### 2.3 Create the env file

```bash
cp .env.prod.example .env.prod
nano .env.prod  # fill in every value — never leave any placeholder unchanged
```

Key rules inside `.env.prod`:
- `REDIS_PASSWORD` must be identical in all three Redis lines (`REDIS_PASSWORD`, `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`)
- `SECRET_KEY` must be at least 50 random characters
- `AWS_S3_ENDPOINT_URL=http://minio:9000` (internal container hostname, not a public URL)
- `MINIO_PUBLIC_URL=https://api.amanapos.com/storage` (public URL Nginx proxies to MinIO)

### 2.4 Obtain SSL certificates

> ⚠️ Nginx must **not** be running when using `--standalone`. Run this before first `docker compose up`.

```bash
# Stop nginx if somehow already running
docker compose -f docker-compose.prod.yml --env-file .env.prod stop nginx

sudo certbot certonly --standalone -d amanapos.com -d www.amanapos.com
sudo certbot certonly --standalone -d api.amanapos.com
sudo certbot certonly --standalone -d app.amanapos.com
```

Nginx expects the certs at:
- `/etc/letsencrypt/live/amanapos.com/fullchain.pem`
- `/etc/letsencrypt/live/api.amanapos.com/fullchain.pem`
- `/etc/letsencrypt/live/app.amanapos.com/fullchain.pem`

The host's `/etc/letsencrypt` directory is mounted read-only into `amanapos_nginx`.

**Certificate renewals** (while nginx is running, uses webroot):
```bash
sudo certbot renew --webroot -w /var/www/certbot
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx nginx -s reload
```

### 2.5 First build and start

```bash
cd /opt/amanapos
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 2.6 MinIO bucket initialisation

`amanapos_minio_init` runs automatically on `up` and exits (`restart: "no"`). It:
- Creates bucket `AWS_S3_PUBLIC_BUCKET_NAME` (public read)
- Creates bucket `AWS_S3_PRIVATE_BUCKET_NAME`
- Creates bucket `AWS_STORAGE_BUCKET_NAME`

To re-run (e.g. after adding a new bucket name to `.env.prod`):
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm minio_init
```

### 2.7 Superuser

If `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD` are set in `.env.prod`, the superuser is created automatically on first boot inside `entrypoint.sh`. Check logs to confirm:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs app | grep -i superuser
```

To create manually instead:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app python manage.py createsuperuser
```

The Django admin panel is available at `https://api.amanapos.com/<ADMIN_URL>` (value of `ADMIN_URL` in `.env.prod`).

---

## 3. Standard deployment

Run after **every `git pull`** when multiple things may have changed.

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild all application images (app, admin, landing, nginx)
#    Uses --no-deps to avoid restarting dependencies (redis, minio) unnecessarily
docker compose -f docker-compose.prod.yml --env-file .env.prod build app admin landing nginx

# 3. Restart app first — entrypoint.sh runs migrate + collectstatic automatically
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app

# 4. Wait for app to become healthy before restarting workers
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app curl -sf http://localhost:8000/api/v1/health/

# 5. Restart Celery worker and beat with the new image
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps celery_worker celery_beat

# 6. Restart frontend services with the new images
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps admin landing

# 7. Reload nginx config (no downtime — only needed if nginx config changed)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx nginx -s reload
```

**Total downtime: ~0** — Gunicorn finishes in-flight requests before shutdown (`--timeout 120`). During the 60s `start_period` health check, nginx may briefly 502 on the API while the new container warms up.

---

## 4. Backend Python changes only (no new deps, no migrations)

Fastest path. No image rebuild needed — just restart the running containers with updated source.

> ⚠️ This only works if the Python code is volume-mounted. In production, source is baked into the image, so a rebuild is still required — but it's fast because the pip wheel layer is cached.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod build app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps celery_worker celery_beat
```

`entrypoint.sh` will re-run `collectstatic` on startup (idempotent, fast if no files changed).

---

## 5. Frontend changes only

Rebuild only the affected Next.js service.

### Admin dashboard changed (`admin/`)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod build admin
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps admin
```

### Landing page changed (`landing_page/`)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod build landing
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps landing
```

> ⚠️ `NEXT_PUBLIC_API_URL` is baked into the **admin** image at build time via `--build-arg` (hardcoded to `https://api.amanapos.com` in `docker-compose.prod.yml`). If you need to change it, edit `docker-compose.prod.yml` and rebuild.

---

## 6. New Python dependencies

The `requirements/production.txt` or `requirements/base.txt` changed — the pip wheel layer in the Dockerfile must be rebuilt from scratch.

```bash
# --no-cache forces Docker to re-run the pip install layer
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache app

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps celery_worker celery_beat
```

---

## 7. New database migrations

### Auto-migrate on startup

`entrypoint.sh` runs `python manage.py migrate --noinput` **before** Gunicorn starts, but **only for the `app` (gunicorn) container**. Celery containers skip migrations.

This means:
- On every `app` container restart, pending migrations are applied automatically.
- You do **not** need to run migrations manually after a normal deploy — step 3 already covers this.

### Running migrations manually (recommended for complex/data migrations)

If a migration is long-running or risky, apply it before restarting the app to control the timing:

```bash
# Run migrations in the already-running app container
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app python manage.py migrate

# Or run in a throw-away container (safer — doesn't affect the live gunicorn process)
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm --no-deps \
  --entrypoint="" app python manage.py migrate
```

### Verify migration state

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app python manage.py showmigrations
```

---

## 8. Nginx config changes

The nginx config is a **bind-mounted volume** (`./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro`), not baked into the image. Changes take effect without a rebuild.

```bash
# 1. Test the config before applying
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx nginx -t

# 2. If test passes, reload without dropping connections
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx nginx -s reload
```

> ⚠️ Only do a full `restart` if you need to change nginx's bound ports or SSL certificate files — `nginx -s reload` is sufficient for all routing/config changes.

```bash
# Full restart (only if necessary — causes ~1s downtime)
docker compose -f docker-compose.prod.yml --env-file .env.prod restart nginx
```

---

## 9. Environment variable changes

Which services to restart depends on which variables changed.

| Changed variable | Restart these services |
|---|---|
| `SECRET_KEY` | `app`, `celery_worker`, `celery_beat` — and all active JWT tokens become invalid |
| `DB_*` | `app`, `celery_worker`, `celery_beat` |
| `REDIS_PASSWORD` / `REDIS_URL` | `redis` first, then `app`, `celery_worker`, `celery_beat` |
| `AWS_*` / MinIO | `app`, `celery_worker`, `celery_beat` |
| `ALLOWED_HOSTS` / `CORS_*` / `CSRF_*` | `app` only |
| `SENTRY_DSN` | `app`, `celery_worker`, `celery_beat` |
| Any `NEXT_PUBLIC_*` | Rebuild + restart `admin` (baked at image build time) |

Restart order for a full env change:

```bash
# 1. Restart Redis with new password (if REDIS_PASSWORD changed)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps redis

# 2. Restart app (migrations run automatically)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app

# 3. Restart workers after app is healthy
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps celery_worker celery_beat
```

---

## 10. Rollback procedure

### Code rollback

```bash
# 1. Find the previous commit
git log --oneline -10

# 2. Check out the previous commit
git checkout <previous-commit-sha>

# 3. Rebuild and redeploy (same as standard deploy)
docker compose -f docker-compose.prod.yml --env-file .env.prod build app admin landing
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app celery_worker celery_beat admin landing
```

### Migration rollback

> ⚠️ Destructive — this reverts schema changes. Ensure you have a database backup first.

```bash
# Show current migration state
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app python manage.py showmigrations

# Roll back a specific app to a specific migration
# Example: roll accounts back to migration 0005
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  python manage.py migrate accounts 0005

# Roll back ALL migrations for an app (dangerous)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  python manage.py migrate accounts zero
```

After rolling back migrations, check out the old code **before** restarting the app — otherwise the old entrypoint will re-apply the forward migrations.

---

## 11. Health checks

Run these after every deploy to confirm everything is up.

```bash
# Django API health endpoint
curl -sf https://api.amanapos.com/api/v1/health/ && echo "OK"

# Admin dashboard
curl -sf https://app.amanapos.com/ -o /dev/null -w "%{http_code}" && echo

# Landing page (Arabic default locale)
curl -sf https://amanapos.com/ -o /dev/null -w "%{http_code}" && echo

# MinIO liveness (internal check)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec minio \
  curl -sf http://localhost:9000/minio/health/live && echo "MinIO OK"

# MinIO public storage proxy (via Nginx)
curl -sf https://api.amanapos.com/storage/ -o /dev/null -w "%{http_code}" && echo

# Celery worker ping
docker compose -f docker-compose.prod.yml --env-file .env.prod exec celery_worker \
  celery -A config.celery inspect ping --timeout 10

# Container health status summary
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

---

## 12. Operational commands

### View logs

```bash
# All services (follow)
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f

# Specific services
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f app
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f celery_worker
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f celery_beat
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f nginx
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f admin
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f landing

# Last 100 lines without following
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 app
```

### Enter a running container

```bash
# Django app shell
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app bash

# Django Python shell (django-extensions shell_plus)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app python manage.py shell

# Celery worker bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec celery_worker bash

# Nginx bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx sh
```

### Django management commands

```bash
# Any management command
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  python manage.py <command>

# Examples
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  python manage.py showmigrations

docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  python manage.py collectstatic --noinput

docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  python manage.py createsuperuser

docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  python manage.py check --deploy
```

### Celery worker status and queue lengths

```bash
# Worker ping
docker compose -f docker-compose.prod.yml --env-file .env.prod exec celery_worker \
  celery -A config.celery inspect ping

# Active tasks
docker compose -f docker-compose.prod.yml --env-file .env.prod exec celery_worker \
  celery -A config.celery inspect active

# Queue lengths (requires redis-cli)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec redis \
  redis-cli --no-auth-warning -a "${REDIS_PASSWORD}" llen default

docker compose -f docker-compose.prod.yml --env-file .env.prod exec redis \
  redis-cli --no-auth-warning -a "${REDIS_PASSWORD}" llen notifications

docker compose -f docker-compose.prod.yml --env-file .env.prod exec redis \
  redis-cli --no-auth-warning -a "${REDIS_PASSWORD}" llen reports
```

### Flush Redis cache

> ⚠️ `FLUSHALL` evicts all keys including Celery task results and session data.

```bash
# Flush all Redis data
docker compose -f docker-compose.prod.yml --env-file .env.prod exec redis \
  redis-cli --no-auth-warning -a "${REDIS_PASSWORD}" FLUSHALL

# Flush only database 0 (broker) — preserves DB 1 (results)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec redis \
  redis-cli --no-auth-warning -a "${REDIS_PASSWORD}" -n 0 FLUSHDB
```

### MinIO bucket operations

```bash
# Enter MinIO client container
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm minio/mc:latest sh

# Inside that shell:
mc alias set myminio http://minio:9000 <AWS_ACCESS_KEY_ID> <AWS_SECRET_ACCESS_KEY>
mc ls myminio
mc ls myminio/amanapos-public
mc mb myminio/new-bucket
mc anonymous set public myminio/amanapos-public
```

---

## 13. Common errors and fixes

### Container fails to start

```bash
# Read the full startup log including entrypoint output
docker compose -f docker-compose.prod.yml --env-file .env.prod logs app

# Check container exit code
docker inspect amanapos_app --format='{{.State.ExitCode}}'
```

Common causes:
- **Exit 1 from entrypoint**: PostgreSQL unreachable. Check `DB_HOST`, `DB_PORT` in `.env.prod` and that the external DB server is reachable from the Docker host.
- **`ModuleNotFoundError`**: New dependency added to `requirements/` but image not rebuilt with `--no-cache`. Run step 6.
- **`django.core.exceptions.ImproperlyConfigured`**: Missing required env variable. Compare `.env.prod` against `.env.prod.example`.

---

### 502 Bad Gateway from Nginx

Nginx can reach the upstream container but the container is not responding.

```bash
# Check which upstream is affected by looking at nginx logs
docker compose -f docker-compose.prod.yml --env-file .env.prod logs nginx | tail -50

# Check if the upstream container is healthy
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

# Test upstream directly (bypassing nginx)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx \
  wget -qO- http://app:8000/api/v1/health/
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx \
  wget -qO- http://admin:3001/
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx \
  wget -qO- http://landing:3000/ar
```

Upstream is down → wait for health check to pass or restart the service. Upstream is responding → check nginx config (`nginx -t`).

---

### Migration conflicts

Symptom: `CommandError: Conflicting migrations detected`.

```bash
# See which apps have conflicts
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  python manage.py migrate --check

# Resolve locally: merge conflicting migrations
python manage.py makemigrations --merge
# Commit the merge file, then redeploy
```

---

### MinIO connection errors

Symptom: `S3 connection error`, `ConnectionRefusedError`, or media files returning 403/404.

```bash
# Check MinIO is running and healthy
docker compose -f docker-compose.prod.yml --env-file .env.prod ps minio
docker compose -f docker-compose.prod.yml --env-file .env.prod logs minio | tail -30

# Verify buckets exist
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm minio_init

# Check that AWS_S3_ENDPOINT_URL=http://minio:9000 (internal hostname, NOT localhost)
grep AWS_S3_ENDPOINT_URL .env.prod
```

---

### Celery tasks not processing

```bash
# Check worker is alive
docker compose -f docker-compose.prod.yml --env-file .env.prod exec celery_worker \
  celery -A config.celery inspect ping --timeout 5

# Check worker logs for errors
docker compose -f docker-compose.prod.yml --env-file .env.prod logs celery_worker | tail -50

# Verify Redis broker is reachable from the worker
docker compose -f docker-compose.prod.yml --env-file .env.prod exec celery_worker \
  python -c "import redis, os; r=redis.from_url(os.environ['CELERY_BROKER_URL']); print(r.ping())"

# Restart worker if stuck
docker compose -f docker-compose.prod.yml --env-file .env.prod restart celery_worker
```

---

### Static files not found (404 on `/static/`)

Symptom: Django admin CSS missing, API responses reference missing static file paths.

`collectstatic` runs automatically via `entrypoint.sh` when the `app` container starts. If it failed silently:

```bash
# Run manually
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
  python manage.py collectstatic --noinput --clear

# Verify static_volume has files
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx \
  ls /app/staticfiles/
```

If the volume is empty, static files haven't been written yet — ensure the `app` container started successfully and check its logs for `collectstatic` output.

---

### CORS errors after deployment

Symptom: Browser console shows `CORS policy` blocked requests.

```bash
grep CORS_ALLOWED_ORIGINS .env.prod
```

Must include every origin making API requests:
```
CORS_ALLOWED_ORIGINS=https://amanapos.com,https://www.amanapos.com,https://app.amanapos.com
```

After fixing `.env.prod`, restart the app:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app
```

---

### JWT token issues after SECRET_KEY rotation

Rotating `SECRET_KEY` invalidates all active JWT tokens — all users will be logged out immediately.

```bash
# After updating SECRET_KEY in .env.prod:
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app celery_worker celery_beat

# Optionally flush the Redis token blacklist/session store
docker compose -f docker-compose.prod.yml --env-file .env.prod exec redis \
  redis-cli --no-auth-warning -a "${REDIS_PASSWORD}" FLUSHALL
```

> ⚠️ Communicate to users that a forced re-login will occur. Do not rotate `SECRET_KEY` during peak hours.
