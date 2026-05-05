# AmanaPOS — Project Overview

AmanaPOS is a **multi-tenant, offline-capable Point-of-Sale SaaS platform** built for small-to-medium businesses in Sudan and the MENA region. It provides a full backend API, a web-based admin dashboard, and a public marketing landing page, all containerised and production-ready.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Repository Structure](#repository-structure)
- [Technology Stack](#technology-stack)
- [Infrastructure & Services](#infrastructure--services)
- [Environments](#environments)
- [Key Domain Concepts](#key-domain-concepts)
- [API Surface](#api-surface)
- [Authentication Flow](#authentication-flow)
- [Offline-First Design](#offline-first-design)
- [Image Handling](#image-handling)
- [Running Locally](#running-locally)
- [Production Deployment](#production-deployment)
- [Detailed Documentation](#detailed-documentation)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         Nginx (reverse proxy)                │
│           Port 80/443 (prod) · Port 8080 (dev)               │
└──────┬───────────────────┬───────────────────┬───────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
 ┌──────────┐       ┌────────────┐      ┌───────────────┐
 │ Django   │       │ Next.js    │      │  Next.js      │
 │ REST API │       │ Admin      │      │  Landing Page │
 │ :8000    │       │ :3001      │      │  :3000        │
 └────┬─────┘       └────────────┘      └───────────────┘
      │
      ├──► PostgreSQL 16 (primary data store)
      ├──► Redis 7       (cache + Celery broker + OTP store)
      ├──► Celery Worker (async tasks: notifications, inventory)
      ├──► Celery Beat   (scheduled: OTP cleanup, subscription checks)
      └──► MinIO         (S3-compatible object storage for images)
```

**Multi-tenant model:** One `Business` (owned by an `owner` user) has many `Shop`s. All data — products, sales, inventory, customers — is scoped to a `Business` (referred to internally as `tenant`).

---

## Repository Structure

```
AmanaPOS/
├── backend/                  # Django REST API
│   ├── apps/                 # 12 Django applications
│   ├── config/               # Settings, URLs, WSGI/ASGI, Celery
│   └── requirements/         # Layered pip requirements
├── admin/                    # Next.js 15 admin dashboard (port 3001)
├── landing_page/             # Next.js 15 marketing site (port 3000)
├── docker/
│   ├── nginx/                # Nginx configs (dev + prod) and Dockerfile
│   └── entrypoint.sh         # Container startup script
├── docs/                     # This documentation
├── Dockerfile                # Multi-stage Python 3.12 image
├── docker-compose.yml        # Development stack (all services)
├── docker-compose.prod.yml   # Production stack (external DB assumed)
├── Makefile                  # Developer shortcuts
├── .env.example              # Environment variable template
└── .env.prod.example         # Production environment template
```

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | Django + Django REST Framework | 5.0.6 / 3.15.2 |
| Admin dashboard | Next.js + React + TypeScript | 15.3.1 / 19 |
| Landing page | Next.js + React + TypeScript | 15.3.1 / 19 |
| Database | PostgreSQL | 16 |
| Cache / message broker | Redis | 7 |
| Async task queue | Celery + django-celery-beat | 5.4 |
| Object storage | MinIO (S3-compatible) | latest |
| Image processing | Pillow | 10.4 |
| Authentication | JWT (SimpleJWT) + OTP (Redis-backed) | — |
| API documentation | drf-spectacular (OpenAPI 3) | — |
| Web server | Nginx + Gunicorn (gthread) | Alpine / 22 |
| Internationalisation | next-intl | 3.26 |
| Charts | Recharts | 3.8 |
| Styling | Tailwind CSS | 3.4 |

---

## Infrastructure & Services

### Development (`docker-compose.yml`)

| Container | Image | Purpose |
|---|---|---|
| `amanapos_app` | Custom Python 3.12 | Gunicorn API server (4 gthread workers) |
| `amanapos_celery_worker` | Same image | Async task processor (4 concurrency, 3 queues) |
| `amanapos_celery_beat` | Same image | Periodic task scheduler (DatabaseScheduler) |
| `amanapos_postgres` | postgres:16-alpine | Primary relational database |
| `amanapos_redis` | redis:7-alpine | Cache, broker, OTP store (256 MB max, LRU eviction) |
| `amanapos_minio` | minio/minio:latest | S3-compatible object storage (API :9000, console :9001) |
| `amanapos_minio_init` | minio/mc | One-off bucket creation (public + private + media) |
| `amanapos_nginx` | Custom Alpine Nginx | Reverse proxy on port 8080 (dev) |

### Production additions (`docker-compose.prod.yml`)

- PostgreSQL is **external** (managed DB expected — not in compose)
- `landing` and `admin` Next.js services are containerised and served through Nginx
- Redis is password-protected with no exposed ports
- MinIO is internal-only (accessed through Nginx `/storage/` proxy)
- SSL/TLS via Let's Encrypt mounted at `/etc/letsencrypt`

---

## Environments

| Variable | Dev default | Purpose |
|---|---|---|
| `SECRET_KEY` | — (required) | Django secret key |
| `DEBUG` | `False` | Debug mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated hosts |
| `DB_*` | postgres/amanapos | PostgreSQL connection |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection |
| `USE_S3` | `True` | Enable MinIO/S3 storage |
| `AWS_ACCESS_KEY_ID` | `minioadmin` | MinIO/S3 key |
| `AWS_SECRET_ACCESS_KEY` | `minioadmin` | MinIO/S3 secret |
| `MINIO_PUBLIC_URL` | — | Public base URL for image URLs (e.g. `https://api.amanapos.com/storage`) |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `60` | Access token TTL |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | `30` | Refresh token TTL |
| `OTP_LENGTH` | `6` | OTP digit count |
| `OTP_EXPIRY_SECONDS` | `300` | OTP validity window |
| `SMS_PROVIDER` | `stub` | SMS backend (stub / twilio) |
| `MAX_IMAGE_UPLOAD_MB` | `10` | Max image upload size |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `FRONTEND_URL` | `http://localhost:3000` | Used in email links |

See `.env.example` and `.env.prod.example` at the root for the full list.

---

## Key Domain Concepts

### Multi-Tenancy

```
Business (tenant)
  └── Shop (one or many per business; one is_main)
        ├── Products       (scoped to tenant + optional shop)
        ├── Inventory      (StockLevel per product × shop)
        ├── Sales          (each sale belongs to a shop)
        └── Staff Users    (CustomUser.business FK)
```

Every API request resolves a tenant:
- **Owner users** — send `X-Tenant-ID` header to select the active business (they can own multiple).
- **Staff users** (manager/cashier) — have a `business` FK, tenant is resolved automatically.

### User Roles

| Role | Access |
|---|---|
| `owner` | Full access to all businesses they own; accesses admin dashboard |
| `manager` | Manages a single business: products, inventory, reports |
| `cashier` | Creates sales at a default shop |

### Bankak Integration

Sudan's mobile payment network. Each business owner can register a `BankakAccount` (phone + account number). Bankak sales require an active account snapshot to be stored on the sale record.

---

## API Surface

Base path: `/api/v1/`  
Public (no token): `/api-public/v1/`

| Prefix | Description |
|---|---|
| `auth/` | OTP login, password login, register, refresh, logout, profile, Bankak account |
| `users/` | Staff user management |
| `tenants/` | Business and shop CRUD |
| `products/` | Product and category CRUD with image upload |
| `inventory/` | Stock levels and movements |
| `sales/` | Sales, cancel, summary, offline sync |
| `customers/` | Customer management |
| `subscriptions/` | Subscription plans and status |
| `admin/` | Admin-panel-specific endpoints (owner management, system stats) |
| `offline/bootstrap/` | Full offline data bundle (single call) |
| `offline/assets/manifest/` | Image cache manifest for mobile |

Full OpenAPI spec: `GET /api/schema/`  
Swagger UI: `/api/docs/`  
ReDoc: `/api/redoc/`

---

## Authentication Flow

```
Mobile/Web Client
      │
      ▼
POST /api-public/v1/auth/login/otp/          ← send phone number
      │   OTP generated, stored in Redis (5 min TTL), sent via SMS
      ▼
POST /api-public/v1/auth/login/otp/verify/   ← send phone + OTP code
      │   Returns { access, refresh } JWT pair
      ▼
Authorization: Bearer <access_token>         ← attach to all private API calls
      │
      ▼
POST /api-public/v1/auth/token/refresh/      ← refresh (rotation enabled)
```

Password login (for admin dashboard): `POST /api-public/v1/auth/login/password/`

JWT settings:
- Access token: 60 minutes
- Refresh token: 30 days (rotated and blacklisted on use)
- Algorithm: HS256

---

## Offline-First Design

Designed for unreliable connectivity (Sudan context). Three dedicated endpoints:

### Bootstrap — `GET /api/v1/offline/bootstrap/`
Returns a complete snapshot of all business data in a single response: business, shops, categories, products, customers, and stock levels. Mobile app caches this on login and operates from it while offline.

### Offline Sync — `POST /api/v1/sales/offline-sync/`
Accepts a batch of sales created while offline. Key properties:
- Each sale processed independently — one failure does not abort others
- **Idempotent** — `client_sale_id` (mobile-generated UUID) deduplicates re-submissions
- Full stock validation, Bankak account validation, and tenant scoping applied

### Asset Manifest — `GET /api/v1/offline/assets/manifest/`
Returns image URLs and `updated_at` timestamps for all product and category images. Mobile app uses this to selectively re-download only changed images.

---

## Image Handling

Images (products and categories) are processed with Pillow before storage:
- **Validation:** JPEG, PNG, or WebP only (magic-byte checked), max `MAX_IMAGE_UPLOAD_MB`
- **Processing:** EXIF stripped, resized to max 2048×2048, re-encoded as WebP
- **Thumbnail:** 400×400 WebP crop saved alongside the original
- **Storage path:** `businesses/{business_id}/{entity_type}/{entity_id}/original.webp`
- **URLs:** Always returned as full absolute URLs (e.g. `https://api.amanapos.com/storage/amanapos-public/businesses/...`)

---

## Running Locally

```bash
# 1. Clone and copy environment file
cp .env.example .env          # fill in SECRET_KEY at minimum

# 2. Start all services
make up                        # docker-compose up --build -d

# 3. Apply migrations
make migrate

# 4. Access
#   API:         http://localhost:8080/api/v1/
#   Swagger UI:  http://localhost:8080/api/docs/
#   MinIO:       http://localhost:9001  (admin console)
#   Django Admin: http://localhost:8080/admin/
```

Common Makefile targets:

```
make up            # start all containers
make down          # stop all containers
make logs          # tail all logs
make logs-app      # tail Django logs only
make migrate       # run migrations
make shell         # Django shell
make test          # run test suite
make lint          # ruff linter
make format        # ruff formatter
```

---

## Production Deployment

```bash
cp .env.prod.example .env.prod

# Edit .env.prod: set SECRET_KEY, DB credentials, MINIO_PUBLIC_URL,
# ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, email/SMS config

docker-compose -f docker-compose.prod.yml up --build -d
```

Key production differences:
- PostgreSQL is external (set `DB_HOST` to your managed DB host)
- `MINIO_PUBLIC_URL` must be set to the public-facing MinIO URL (proxied through Nginx at `/storage/`)
- SSL certificates mounted from `/etc/letsencrypt` (Let's Encrypt / Certbot)
- `DEBUG=False`, `USE_S3=True`

---

## Detailed Documentation

| Document | Contents |
|---|---|
| [BACKEND.md](BACKEND.md) | Apps, models, API endpoints, services, Celery tasks, settings reference |
| [DASHBOARD.md](DASHBOARD.md) | Admin dashboard pages, data flow, components, i18n, build |
| [LANDING_PAGE.md](LANDING_PAGE.md) | Landing page structure, i18n, deployment |
