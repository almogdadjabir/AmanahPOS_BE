# External Integrations

**Analysis Date:** 2026-05-19

## APIs & External Services

### Twilio Programmable Messaging (OTP delivery — SMS + WhatsApp)

- **Purpose:** Delivers OTP verification codes to users via SMS or WhatsApp
- **SDK:** `twilio>=9.0.0,<10.0.0` — imported lazily inside `send_otp()` to avoid hard boot failure
- **Integration file:** `backend/apps/accounts/otp/providers.py` — `TwilioMessagingOtpSender` class
- **How it works:** Activated when `OTP_PROVIDER=twilio_messaging`. Sends via `client.messages.create()`. WhatsApp uses `whatsapp:{phone}` as the `to` address.
- **Env vars:**
  - `OTP_PROVIDER=twilio_messaging` — activates this provider
  - `TWILIO_ACCOUNT_SID` — Twilio account identifier
  - `TWILIO_AUTH_TOKEN` — Twilio API secret
  - `TWILIO_SMS_FROM` — sender number for SMS channel (e.g. `+14155238886`)
  - `TWILIO_WHATSAPP_FROM` — sender for WhatsApp channel (e.g. `whatsapp:+14155238886`)
  - `TWILIO_FROM_NUMBER` — legacy alias for SMS from-number (kept for backwards compatibility)
- **Fallback:** If `OTP_PROVIDER` is not `twilio_messaging`, `StubOtpSender` is used — logs the attempt but makes no network call. This is the default in development. If Twilio credentials are missing at call time, `OtpSendResult(success=False, error=...)` is returned — no exception propagated.

### BudgetSMS.net (SMS delivery — alternative to Twilio)

- **Purpose:** Low-cost SMS delivery for OTP and notifications, primarily targeting MENA region
- **SDK:** No SDK — raw HTTP GET via stdlib `urllib.request`
- **Integration file:** `backend/apps/notifications/services/sms/budgetsms.py` — `BudgetSmsProvider` class
- **API endpoint:** `https://api.budgetsms.net/sendsms/` (GET with query params)
- **Activated by:** `SMS_PROVIDER=budgetsms` (default in `.env.prod.example`)
- **Env vars:**
  - `SMS_PROVIDER=budgetsms`
  - `BUDGETSMS_USERNAME` — account username
  - `BUDGETSMS_USERID` — account user ID
  - `BUDGETSMS_HANDLE` — API handle/key
  - `BUDGETSMS_SENDER_ID` — from-name displayed to recipient (default: `AmanaPOS`)
- **Fallback:** `BudgetSmsError` is raised on network failure or API rejection (error codes 101–3003 mapped to human-readable messages). No automatic retry in the provider itself — retry logic must be handled by the caller.

### Firebase Cloud Messaging (push notifications)

- **Purpose:** Sends push notifications to mobile devices (Android + iOS) for events like sales alerts, subscription expiry, low stock warnings
- **SDK:** `firebase-admin==6.5.0`
- **Integration file:** `backend/apps/notifications/services/push/firebase_service.py` — `FirebaseService` singleton class
- **How it works:** Lazy singleton — SDK is initialized on first call to `_init()`. Supports `send_to_token()` (single device) and `send_to_user()` (all active tokens for a user). Invalid/unregistered tokens are automatically deactivated in `notifications.DeviceToken`.
- **Credential loading (one of two methods):**
  - `FIREBASE_CREDENTIALS_PATH` — path to service account JSON file (mounted as `/run/secrets/firebase_credentials.json` in `docker-compose.prod.yml`)
  - `FIREBASE_SERVICE_ACCOUNT_JSON` — full JSON as a single-line string env var
- **Env vars:**
  - `FIREBASE_ENABLED=True` — must be explicitly set; defaults to `False` in all settings
  - `FIREBASE_PROJECT_ID` — Firebase project identifier
  - `FIREBASE_CREDENTIALS_PATH` — absolute path to service account JSON (option A)
  - `FIREBASE_SERVICE_ACCOUNT_JSON` — inline JSON string (option B)
- **Fallback:** When `FIREBASE_ENABLED=False` (default), `FirebaseService._init()` returns `False` and all methods return `PushResult(success=False, error="firebase_disabled")`. Push failures never raise exceptions and never block business logic.

## Data Storage

### PostgreSQL (primary database)

- **Version:** 16 (`postgres:16-alpine` in dev Docker; external host in prod)
- **Driver:** `psycopg2-binary==2.9.9`
- **ORM:** Django ORM
- **Connection env vars:**
  - `DB_NAME` (default: `amanapos`)
  - `DB_USER` (default: `amanapos`)
  - `DB_PASSWORD`
  - `DB_HOST` (default: `postgres` in dev, external IP in prod e.g. `10.0.0.3`)
  - `DB_PORT` (default: `5432`)
- **Connection pooling:** `CONN_MAX_AGE=60` (persistent connections, 60 s keepalive)
- **Schema:** Single `public` schema; `search_path=public` enforced via `OPTIONS`

### Redis (cache + Celery broker)

- **Version:** 7 (`redis:7-alpine`)
- **Client:** `redis==5.0.8` + `hiredis==3.0.0` (fast parser) + `django-redis==5.4.0`
- **Uses three logical databases:**
  - `db/0` — Django cache (key prefix `amanapos`, TTL 300 s, `IGNORE_EXCEPTIONS=True`)
  - `db/1` — Celery broker
  - `db/2` — Celery result backend (dev); prod uses `db/0` and `db/1` only (see `.env.prod.example`)
- **OTP storage:** OTP codes and attempt counters stored in Redis under prefix `otp:` (set in `OTP_REDIS_PREFIX`)
- **Session storage:** Django sessions stored in Redis cache backend
- **Production:** password-protected (`REDIS_PASSWORD`), `maxmemory 256mb`, `allkeys-lru` eviction, AOF persistence enabled
- **Env vars:**
  - `REDIS_URL` — Django cache URL (default: `redis://redis:6379/0`)
  - `CELERY_BROKER_URL` — Celery broker URL (default: `redis://redis:6379/1`)
  - `CELERY_RESULT_BACKEND` — task result URL (default: `redis://redis:6379/2`)
  - `REDIS_PASSWORD` — required in production

### MinIO (S3-compatible object storage)

- **Version:** `minio/minio:latest`
- **Purpose:** Stores product images, category images, and other media files
- **SDK:** `boto3==1.35.20` (direct S3 API) + `django-storages==1.14.4` (`S3Boto3Storage` subclasses)
- **Storage backends (all in `backend/apps/core/storage.py`):**
  - `PublicMediaStorage` — public-read ACL, no signed URLs, bucket `amanapos-public`
  - `PrivateMediaStorage` — private ACL, signed URLs (1 hr expiry), bucket `amanapos-private`
  - `MediaStorage` — general media, private, signed URLs, bucket `amanapos-media`
- **Image pipeline (`backend/apps/core/image_service.py`):**
  - Validates file type via magic bytes (JPEG/PNG/WebP only)
  - Converts to WebP, strips EXIF, resizes to max 2048px, generates 400×400 thumbnail
  - Uploads original + thumbnail to `amanapos-public` bucket via `boto3` directly
- **Fallback when `USE_S3=False`:** Files saved to local filesystem under `MEDIA_ROOT`. All storage calls switch to `_save_to_local()` and `build_image_url()` builds relative URLs using `request.build_absolute_uri()`.
- **Nginx proxy:** MinIO is not publicly exposed on a port in production. Assets served via Nginx `/storage/` location which proxies to `http://minio:9000/`.
- **Env vars:**
  - `USE_S3=True` — enables S3/MinIO storage; `False` = local filesystem fallback
  - `AWS_ACCESS_KEY_ID` — MinIO root user
  - `AWS_SECRET_ACCESS_KEY` — MinIO root password
  - `AWS_S3_ENDPOINT_URL` — MinIO URL (default: `http://minio:9000`)
  - `AWS_STORAGE_BUCKET_NAME` — general media bucket (default: `amanapos-media`)
  - `AWS_S3_PUBLIC_BUCKET_NAME` — public bucket (default: `amanapos-public`)
  - `AWS_S3_PRIVATE_BUCKET_NAME` — private bucket (default: `amanapos-private`)
  - `AWS_S3_REGION_NAME` — region (default: `us-east-1`)
  - `AWS_DEFAULT_ACL` — default ACL (default: `private`)
  - `MINIO_PUBLIC_URL` — public-facing base URL for building image URLs (e.g. `https://api.amanapos.com/storage` in prod, `http://localhost:9000` in dev)
  - `MAX_IMAGE_UPLOAD_MB` — upload size limit (default: `10`)

## Authentication & Identity

### JWT (djangorestframework-simplejwt)

- **Library:** `djangorestframework-simplejwt==5.3.1`
- **Algorithm:** HS256, signed with `SECRET_KEY`
- **Access token lifetime:** configurable via `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` (default: 60 min)
- **Refresh token lifetime:** configurable via `JWT_REFRESH_TOKEN_LIFETIME_DAYS` (default: 30 days)
- **Token rotation:** enabled — refresh tokens are blacklisted after rotation
- **Token blacklist:** `rest_framework_simplejwt.token_blacklist` app installed
- **Header:** `Authorization: Bearer <token>`

### OTP Authentication (phone-based login)

- **Storage:** OTP codes stored in Redis (not database) with TTL = `OTP_EXPIRY_SECONDS` (default: 300 s)
- **Rate limiting:** `OTP_MAX_ATTEMPTS=5`, `OTP_RESEND_COOLDOWN_SECONDS=60`
- **Provider selection:** `OTP_PROVIDER` env var — `stub` (dev) or `twilio_messaging` (prod)
- **Channels:** `sms` (default) and `whatsapp` — configured via `OTP_ALLOWED_CHANNELS`
- **Test bypass:** `TEST_PHONE` + `TEST_OTP` env vars allow a fixed phone/OTP pair to bypass real delivery (for automated tests and QA; both must be unset in production)

## Monitoring & Observability

### Sentry (error tracking)

- **Library:** `sentry-sdk==2.13.0`
- **Integrations activated:** `DjangoIntegration`, `CeleryIntegration`, `RedisIntegration`
- **Configuration file:** `backend/config/settings/production.py` (lines 58–72)
- **Sampling:** `traces_sample_rate=0.1`, `profiles_sample_rate=0.1`
- **Env vars:**
  - `SENTRY_DSN` — Sentry project DSN; leave blank to disable (safe — guarded by `if SENTRY_DSN`)
  - `GIT_COMMIT_SHA` — optional, used as `release` identifier in Sentry
- **Fallback:** Import is wrapped in `try/except ImportError` (`_SENTRY_AVAILABLE` flag); Sentry is skipped entirely if DSN is empty.

### Django Health Check

- **Library:** `django-health-check==3.18.3`
- **Endpoint:** `GET /api/v1/health/` — used as Docker healthcheck for `app` and `celery_worker` containers
- **Configuration file:** `backend/apps/core/urls.py`

### Logging

- **Library:** `structlog==24.4.0` (imported) + Django standard `logging` module
- **Output:** stdout/stderr (console handler) — captured by Docker log driver
- **Development:** `DEBUG` level for `apps.*`, `INFO` for Django and Celery
- **Production:** `WARNING` root level; `ERROR` for `django.request`, `INFO` for `apps.*`

## Email

- **Backend (prod):** SMTP via `django.core.mail.backends.smtp.EmailBackend`
- **Default SMTP host:** `smtp.gmail.com:587` (TLS)
- **Dev fallback:** Can be overridden to `django.core.mail.backends.console.EmailBackend` via `EMAIL_BACKEND` env var
- **Env vars:**
  - `EMAIL_BACKEND`
  - `EMAIL_HOST` (default: `smtp.gmail.com`)
  - `EMAIL_PORT` (default: `587`)
  - `EMAIL_USE_TLS` (default: `True`)
  - `EMAIL_HOST_USER`
  - `EMAIL_HOST_PASSWORD`
  - `DEFAULT_FROM_EMAIL` (default: `noreply@amanapos.com`)

## CI/CD & Deployment

**Hosting:**
- Self-hosted via Docker Compose on a Linux server
- Nginx handles TLS termination with Let's Encrypt certificates (`certbot --standalone` for initial issuance, `certbot renew --webroot` for renewals)
- No CI pipeline detected in the repository

**Production deploy command (from `.env.prod.example`):**
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app python manage.py migrate
```

## Webhooks & Callbacks

**Incoming:** None detected.

**Outgoing:**
- Twilio: outbound HTTP POST to Twilio API when OTP is dispatched
- BudgetSMS: outbound HTTP GET to `https://api.budgetsms.net/sendsms/` when SMS is sent
- Firebase FCM: outbound gRPC/HTTP2 to Google FCM when push notification is sent
- Sentry: outbound HTTPS to configured `SENTRY_DSN` on unhandled exceptions

## Celery Scheduled Tasks

Registered in `CELERY_BEAT_SCHEDULE` (`backend/config/settings/base.py`):

| Task | Schedule | Queue |
|---|---|---|
| `apps.accounts.tasks.cleanup_expired_otps` | Every 1 hour | default |
| `apps.subscriptions.tasks.check_subscription_expiry` | Daily | default |
| `apps.notifications.tasks.requeue_stuck_deliveries` | Every 5 minutes | notifications |
| `apps.inventory.tasks.check_expiry_alerts` | Daily | default |

Queue routing:
- `apps.notifications.tasks.*` → `notifications` queue
- `apps.sales.tasks.*` → `default` queue
- `apps.inventory.tasks.*` → `default` queue

---

*Integration audit: 2026-05-19*
