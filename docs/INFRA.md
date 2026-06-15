# AmanaPOS — Production Infrastructure

Docker Compose on a single VPS. PostgreSQL lives on a separate managed server and is **not** part of this stack.

---

## Architecture Overview

```
Internet
   │
   ▼ :80 / :443
┌──────────────────────────────────────────────────┐
│  Nginx  (amanapos_nginx)                          │
│  TLS termination · rate limiting · static files   │
└─────────┬───────────────────────────┬────────────┘
          │                           │
     api.amanapos.com          amanapos.com
     app.amanapos.com          (www redirect)
          │                           │
     ┌────▼──────┐            ┌───────▼──────┐
     │  Django   │            │  Landing     │
     │  (app)    │            │  (landing)   │
     │  :8000    │            │  Next.js     │
     └────┬──────┘            │  :3000       │
          │ internal          └──────────────┘
     ┌────▼──────┐  ┌────────────────┐
     │  Admin    │  │  Celery Worker │
     │  (admin)  │  │  + Beat        │
     │  Next.js  │  │  (4 queues)    │
     │  :3001    │  └───────┬────────┘
     └───────────┘          │
                     ┌──────▼──────┐  ┌──────────────┐
                     │  Redis :6379│  │  MinIO :9000 │
                     │  (internal) │  │  (internal)  │
                     └─────────────┘  └──────────────┘
                                              │
                              /storage/ proxy via nginx
                              (public bucket images)

                     ┌─────────────────────────┐
                     │  PostgreSQL             │
                     │  EXTERNAL SERVER        │
                     │  DB_HOST=<remote-host>  │
                     └─────────────────────────┘
```

---

## Services

| Container | Image / Build | Exposed | Role |
|---|---|---|---|
| `amanapos_nginx` | `./docker/nginx` (custom) | `80`, `443` | TLS termination, reverse proxy, static files, MinIO proxy |
| `amanapos_app` | `./Dockerfile` (final stage) | internal `:8000` | Django API — Gunicorn 4 workers × 2 threads |
| `amanapos_celery_worker` | same image | — | Task queues: `default`, `notifications`, `reports` |
| `amanapos_celery_beat` | same image | — | Periodic scheduler (DatabaseScheduler) |
| `amanapos_admin` | `./admin/Dockerfile` | internal `:3001` | Next.js admin dashboard (SSR, server-side fetches hit `app:8000` directly) |
| `amanapos_landing` | `./landing_page/Dockerfile` | internal `:3000` | Next.js marketing site |
| `amanapos_redis` | `redis:7-alpine` | internal only | Cache, sessions, OTP (DB0) · Celery broker (DB1) · Celery results (DB2) |
| `amanapos_minio` | `minio/minio:latest` | internal only | S3-compatible object storage — `amanapos-public`, `amanapos-private`, `amanapos-media` |
| `amanapos_minio_init` | `minio/mc:latest` | — | One-shot bucket creation, sets public ACL on `amanapos-public`. Runs once, then exits. |

---

## Prerequisites

### Server

| Resource | Minimum | Recommended |
|---|---|---|
| vCPU | 2 | 4 |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

**Install on the server:**
```bash
# Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-login after
docker compose version           # should be v2.x
```

### DNS Records

| Record | Type | Value |
|---|---|---|
| `amanapos.com` | A | `<server-ip>` |
| `www.amanapos.com` | A | `<server-ip>` |
| `api.amanapos.com` | A | `<server-ip>` |
| `app.amanapos.com` | A | `<server-ip>` |

All four must resolve before issuing TLS certificates.

### Firewall

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Let's Encrypt challenge + redirect)
ufw allow 443/tcp   # HTTPS
ufw enable
```

Redis and MinIO ports (`6379`, `9000`, `9001`) stay closed — they are internal Docker network only.

### External PostgreSQL Access

The app server must be able to reach the database server on port 5432. Whitelist the app server's IP in the DB server's firewall / pg_hba.conf.

---

## TLS Certificates

Certificates must exist **before** starting Nginx the first time. With nginx stopped, run certbot in standalone mode:

```bash
# Install certbot
sudo apt install certbot

# Issue certificates (nginx must be stopped or not yet started)
sudo certbot certonly --standalone -d amanapos.com -d www.amanapos.com
sudo certbot certonly --standalone -d api.amanapos.com
sudo certbot certonly --standalone -d app.amanapos.com
```

Certificates land in `/etc/letsencrypt/live/<domain>/`. Nginx mounts `/etc/letsencrypt` read-only.

**Auto-renewal** (nginx running, webroot method):

```bash
# Certbot renews via the /var/www/certbot webroot volume that nginx serves
sudo certbot renew --webroot -w /var/www/certbot

# Add to cron (runs twice daily — certbot skips certs with >30d remaining)
echo "0 3,15 * * * root certbot renew --webroot -w /var/www/certbot --quiet && docker exec amanapos_nginx nginx -s reload" \
  | sudo tee /etc/cron.d/certbot-renew
```

---

## Environment File

Copy `.env.prod.example` → `.env.prod` and fill every value before deploying.

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

**Critical values for production:**

```dotenv
# Django
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=<64-char random string>
DEBUG=False
ALLOWED_HOSTS=api.amanapos.com,app.amanapos.com

# Database — external server
DB_HOST=<remote-postgres-host-or-ip>
DB_PORT=5432
DB_NAME=amanapos
DB_USER=amanapos
DB_PASSWORD=<strong-password>

# Redis — password required in prod
REDIS_PASSWORD=<strong-password>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/1
CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/2

# MinIO
AWS_ACCESS_KEY_ID=<minio-root-user>
AWS_SECRET_ACCESS_KEY=<minio-root-password>
AWS_S3_ENDPOINT_URL=http://minio:9000
AWS_S3_PUBLIC_BUCKET_NAME=amanapos-public
AWS_S3_PRIVATE_BUCKET_NAME=amanapos-private
AWS_STORAGE_BUCKET_NAME=amanapos-media
# Images are served via the nginx /storage/ proxy
MINIO_PUBLIC_URL=https://api.amanapos.com/storage

# Firebase Push Notifications
FIREBASE_ENABLED=True
FIREBASE_CREDENTIALS_PATH=/run/secrets/firebase_credentials.json

# SMS
SMS_PROVIDER=budgetsms   # or twilio

# CORS
CORS_ALLOWED_ORIGINS=https://amanapos.com,https://app.amanapos.com

# Sentry
SENTRY_DSN=<your-sentry-dsn>

# Admin superuser (created automatically on first boot)
DJANGO_SUPERUSER_EMAIL=admin@amanapos.com
DJANGO_SUPERUSER_PASSWORD=<change-immediately-after-first-login>
DJANGO_SUPERUSER_PHONE=+249xxxxxxxxx
```

---

## Firebase Credentials

The Celery worker and the app container expect a service-account JSON file at `/run/secrets/firebase_credentials.json` (bind-mounted in `docker-compose.prod.yml`).

Place the file at the repo root before deploying:

```bash
# Copy from wherever you downloaded the file
cp ~/amanapos-firebase-adminsdk-*.json ./amanapos-firebase-adminsdk-fbsvc-5ad506802f.json
chmod 600 ./amanapos-firebase-adminsdk-fbsvc-5ad506802f.json
```

---

## Volumes

| Volume | Mount(s) | Contents |
|---|---|---|
| `redis_data` | `redis:/data` | Redis AOF persistence |
| `minio_data` | `minio:/data` | All uploaded objects |
| `static_volume` | `app:/app/staticfiles` → `nginx:/app/staticfiles` (ro) | Django collected statics |
| `media_volume` | `app:/app/media` → `nginx:/app/media` (ro) | Local media (when `USE_S3=False`) |
| `certbot_webroot` | `nginx:/var/www/certbot` (ro) | Let's Encrypt ACME challenge files |

Volumes survive container restarts and `docker compose down`. Use `docker compose down -v` only if you want to wipe data.

---

## Nginx Routing

| Domain | Path | Upstream |
|---|---|---|
| `amanapos.com` (+ `www`) | `/*` | `landing:3000` |
| `api.amanapos.com` | `/static/` | local `staticfiles` volume |
| `api.amanapos.com` | `/media/` | local `media` volume |
| `api.amanapos.com` | `/storage/` | `minio:9000` (public bucket proxy) |
| `api.amanapos.com` | `/api-public/v1/auth/login/otp/` | `app:8000` — **5 req/min** |
| `api.amanapos.com` | `/api-public/v1/auth/login/` | `app:8000` — **10 req/min** |
| `api.amanapos.com` | `/api-public/` | `app:8000` — **60 req/min** |
| `api.amanapos.com` | `/api/v1/auth/` | `app:8000` — **10 req/min** |
| `api.amanapos.com` | `/api/` | `app:8000` — **60 req/min** |
| `api.amanapos.com` | `/admin/` | `app:8000` — **IP restricted** |
| `app.amanapos.com` | `/*` | `admin:3001` |

> Django admin (`/admin/`) is IP-restricted in `nginx.prod.conf`. Add your management IP:
> ```nginx
> allow <YOUR_IP>;
> ```

---

## First Deploy

```bash
# 1. Clone the repo
git clone <repo-url> /opt/amanapos
cd /opt/amanapos

# 2. Place Firebase credentials
cp ~/amanapos-firebase-adminsdk-*.json ./amanapos-firebase-adminsdk-fbsvc-5ad506802f.json

# 3. Fill environment
cp .env.prod.example .env.prod && nano .env.prod

# 4. Issue TLS certificates (certbot standalone, nginx not yet running)
sudo certbot certonly --standalone -d amanapos.com -d www.amanapos.com
sudo certbot certonly --standalone -d api.amanapos.com
sudo certbot certonly --standalone -d app.amanapos.com

# 5. Build images
docker compose -f docker-compose.prod.yml build --no-cache

# 6. Start (entrypoint runs migrate + collectstatic on first app start)
docker compose -f docker-compose.prod.yml up -d

# 7. Verify all containers are healthy
docker compose -f docker-compose.prod.yml ps
```

On first start `amanapos_minio_init` creates the three buckets and sets the public ACL, then exits with code 0 — this is expected.

---

## Subsequent Deploys

```bash
cd /opt/amanapos

# Pull latest code
git pull

# Rebuild only changed images, then replace containers with zero-ish downtime
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

The `app` entrypoint runs `migrate` and `collectstatic` automatically on every restart. For large migrations that need careful staging, run them manually before restarting the app:

```bash
docker compose -f docker-compose.prod.yml run --rm app python manage.py migrate
```

---

## Health Checks

| Container | Check | Interval |
|---|---|---|
| `app` | `GET http://localhost:8000/api/v1/health/` | 30s, 5 retries, 60s start |
| `celery_worker` | `celery inspect ping` | 60s, 3 retries |
| `redis` | `redis-cli ping` | 10s, 5 retries |
| `minio` | `GET http://localhost:9000/minio/health/live` | 30s, 3 retries |
| `nginx` | `nginx -t` | 30s, 3 retries |
| `admin` | `wget -qO- http://127.0.0.1:3001/` | 30s, 3 retries, 60s start |
| `landing` | `fetch http://localhost:3000/api/health` | 30s, 3 retries |

---

## Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Single service
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f celery_worker
docker compose -f docker-compose.prod.yml logs -f nginx
```

Django logs go to stdout/stderr (captured by Docker). Nginx access and error logs write to `/var/log/nginx/` inside the container and also to stdout.

---

## Backup

### PostgreSQL

Backups are the responsibility of the external DB server. At minimum, schedule daily `pg_dump`:

```bash
# Run from the DB server or any host with psql access
pg_dump -h <DB_HOST> -U amanapos -d amanapos -Fc \
  | gzip > /backups/amanapos_$(date +%F).dump.gz
```

Retain at least 7 daily dumps.

### MinIO Objects

```bash
# From the app server — sync the minio volume to an off-server location
docker run --rm \
  -v amanapos_minio_data:/data:ro \
  -v /backups/minio:/backup \
  busybox tar czf /backup/minio_$(date +%F).tar.gz /data
```

Or use `mc mirror` to replicate to a remote S3 bucket.

### Redis

Redis uses AOF persistence. The `redis_data` volume is the source of truth. Back it up the same way as minio, or accept that OTP/session data is ephemeral (it is — TTLs are short).

---

## Scaling Notes

This is a single-host Compose stack. Horizontal scaling options when needed:

- **More Gunicorn workers:** increase `--workers` in `docker-compose.prod.yml` → `app` command (or set `GUNICORN_WORKERS` env var).
- **More Celery concurrency:** change `--concurrency=4` on `celery_worker`.
- **Multiple app replicas:** switch to Docker Swarm or Kubernetes; the app is stateless.
- **MinIO to managed S3:** change `AWS_S3_ENDPOINT_URL` to your S3-compatible provider endpoint and set `USE_S3=True`. No code changes required.
