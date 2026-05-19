# Technology Stack

**Analysis Date:** 2026-05-19

## Languages

**Primary:**
- Python 3.12 — backend (Django API, Celery workers, all business logic)
- TypeScript 5.x — admin dashboard (`admin/`) and landing page (`landing_page/`)

**Secondary:**
- SQL — PostgreSQL queries via Django ORM

## Runtime

**Environment:**
- Python 3.12 (pinned in `Dockerfile`: `FROM python:3.12-slim`)
- Node.js 20.x (inferred from `@types/node: ^20` in both frontend `package.json` files)

**Package Manager:**
- Python: `pip` with wheel pre-build in Docker multi-stage build
  - Lockfile: Not present — version ranges pinned directly in requirements files
- Node: npm (lockfile present in `admin/` and `landing_page/`)

## Frameworks

**Core Backend:**
- Django 5.0.6 — web framework, ORM, admin, migrations
- Django REST Framework 3.15.2 — REST API layer
- Celery 5.4.0 — async task queue and scheduled jobs

**Frontend — Admin Dashboard:**
- Next.js 15.3.1 (`admin/`) — React 19 app for internal management UI
  - Runs on port 3001 in production

**Frontend — Landing Page:**
- Next.js 15.5.18 (`landing_page/`) — marketing site
  - Runs on port 3000 in production

**Testing:**
- pytest 8.3.2 with pytest-django 4.8.0
- pytest-cov 5.0.0 — coverage
- pytest-mock 3.14.0 — mocking
- factory-boy 3.3.1 + model-bakery 1.19.5 — test data factories
- faker 27.0.0 — fake data generation

**Build/Dev:**
- black 24.8.0 — Python code formatter
- isort 5.13.2 — import sorter
- flake8 7.1.1 + flake8-bugbear — Python linter
- mypy 1.11.2 with django-stubs 5.0.4 — static type checking
- ESLint 9 + eslint-config-next — TypeScript/JS linting
- Tailwind CSS 3.4.17 — utility CSS for both frontends

## Key Dependencies

**Critical Backend:**
- `psycopg2-binary==2.9.9` — PostgreSQL driver
- `django-redis==5.4.0` + `redis==5.0.8` + `hiredis==3.0.0` — Redis cache backend with fast parser
- `djangorestframework-simplejwt==5.3.1` + `PyJWT==2.8.0` — JWT authentication
- `django-celery-beat==2.7.0` + `django-celery-results==2.5.1` — Celery scheduling (DB-backed) and result storage
- `boto3==1.35.20` + `django-storages==1.14.4` — S3/MinIO object storage
- `Pillow==10.4.0` — image processing (WebP conversion, resizing, EXIF stripping)
- `firebase-admin==6.5.0` — Firebase Cloud Messaging push notifications
- `twilio>=9.0.0,<10.0.0` — Twilio SMS/WhatsApp OTP delivery
- `orjson==3.10.7` — fast JSON serialization
- `structlog==24.4.0` — structured logging
- `cryptography==43.0.0` — security primitives
- `phonenumbers==8.13.44` — phone number parsing and validation
- `httpx==0.27.2` + `requests==2.32.3` — HTTP clients (for outbound API calls)

**API Documentation:**
- `drf-spectacular==0.27.2` — OpenAPI 3.0 schema generation, served at `/api/schema/`

**Infrastructure (backend):**
- `gunicorn==22.0.0` — WSGI server (production), `gthread` worker class, 4 workers × 2 threads
- `whitenoise==6.7.0` — static file serving in production via `CompressedManifestStaticFilesStorage`
- `sentry-sdk==2.13.0` — error tracking (Django + Celery + Redis integrations)
- `django-health-check==3.18.3` — `/api/v1/health/` endpoint
- `django-ratelimit==4.1.0` — request rate limiting
- `django-cors-headers==4.4.0` — CORS handling
- `django-filter==24.3` — queryset filtering for DRF
- `django-environ==0.11.2` — `.env` file loading and type casting

**Frontend (Admin Dashboard `admin/`):**
- React 19, Next.js 15.3.1
- `@radix-ui/*` — headless UI primitives (dialogs, dropdowns, avatars, etc.)
- `recharts 3.8.1` — charting
- `next-intl 3.26.3` — i18n
- `lucide-react 1.14.0` — icons
- `class-variance-authority`, `clsx`, `tailwind-merge` — className utilities

**Frontend (Landing Page `landing_page/`):**
- React 19, Next.js 15.5.18
- `framer-motion 12.38.0` — animations
- `next-intl 3.26.3` — i18n
- `lucide-react 1.14.0` — icons

## Configuration

**Environment:**
- All backend config loaded via `django-environ` from `.env` (dev) or `.env.prod` (production)
- Read at `backend/config/settings/base.py` line 32: `environ.Env.read_env(BASE_DIR.parent / ".env")`
- Settings split across: `base.py`, `local.py`, `production.py`, `test.py`
- Active settings module set by `DJANGO_SETTINGS_MODULE` env var

**Key env vars required at runtime:**
- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`
- `USE_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_ENDPOINT_URL`
- `OTP_PROVIDER` — selects OTP delivery backend (`stub` | `twilio_messaging`)
- `FIREBASE_ENABLED`, `FIREBASE_CREDENTIALS_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON`

**Build:**
- `Dockerfile` — multi-stage: `builder` stage pip-wheels, `final` stage copies wheels
- `docker-compose.yml` — development stack (includes postgres container)
- `docker-compose.prod.yml` — production stack (uses external DB at `DB_HOST`, no postgres container)

## Infrastructure / Deployment

**Containerization:**
- Docker with multi-stage build (`Dockerfile`)
- All services in a single `amanapos_net` bridge network
- Non-root user `appuser` (uid 1001) in all containers

**Production services (docker-compose.prod.yml):**
| Container | Image/Build | Role |
|---|---|---|
| `amanapos_app` | Custom (Django) | Gunicorn WSGI on :8000 |
| `amanapos_celery_worker` | Custom (Django) | Celery worker, queues: `default,notifications,reports` |
| `amanapos_celery_beat` | Custom (Django) | Celery beat scheduler (DB-backed) |
| `amanapos_redis` | `redis:7-alpine` | Broker + cache, 256 MB, password-protected |
| `amanapos_minio` | `minio/minio:latest` | S3-compatible object storage |
| `amanapos_minio_init` | `minio/mc:latest` | One-shot bucket initializer |
| `amanapos_admin` | Custom (Next.js) | Admin dashboard on :3001 |
| `amanapos_landing` | Custom (Next.js) | Landing page on :3000 |
| `amanapos_nginx` | Custom (nginx) | Reverse proxy, TLS termination |

**Reverse Proxy (Nginx):**
- Config: `docker/nginx/nginx.prod.conf`
- TLS via Let's Encrypt (`/etc/letsencrypt`)
- Domains: `amanapos.com` → landing, `api.amanapos.com` → Django, `app.amanapos.com` → admin
- MinIO assets proxied at `/storage/` on `api.amanapos.com`
- Rate limit zones: `api_limit` (60 req/min), `auth_limit` (10 req/min), `otp_limit` (5 req/min)

**Database (production):**
- External PostgreSQL 16 (not a Docker container in prod — `DB_HOST=10.0.0.3` in `.env.prod.example`)
- Dev: `postgres:16-alpine` container exposed on port 5432

## Dev Tooling

- `django-debug-toolbar==4.4.6` — SQL and performance profiling (local only)
- `django-silk==5.1.0` — request/response profiling (local only)
- `ipython==8.26.0` + `ipdb==0.13.13` — enhanced REPL and debugger
- `Werkzeug==3.0.3` — dev server utilities
- `django-extensions==3.2.3` — management commands (`shell_plus`, `show_urls`, etc.)

---

*Stack analysis: 2026-05-19*
