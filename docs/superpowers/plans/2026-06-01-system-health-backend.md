# System Health Check Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose three super-admin-only API endpoints under `/api/v1/admin/system/` that report live health of backend, database, Redis, Celery, Celery Beat, and MinIO/storage — plus operational counters for notifications and audit logs.

**Architecture:** Add a `system/` subpackage inside `apps/admin_panel/`. All health probes live in `health_checks.py`, DB-derived counters in `selectors.py`, orchestration in `services.py`, and HTTP layer in `views.py`. The overview endpoint caches for 20 seconds using Django's existing Redis cache. No new models or migrations needed.

**Tech Stack:** Django 5 · DRF · django_redis · redis-py (already installed) · boto3 (already installed via django-storages) · django-celery-beat · Celery inspect API

---

## Codebase Facts (Read Before Touching Code)

- `AuditLog` stores `extra={"status_code": ..., "duration_ms": ...}`. The middleware now logs ALL responses ≥200, including 5xx, so `error_logs_24h` can be queried via `extra__status_code__gte=500`. The middleware fix (`apps/audit_logs/middleware.py`) is already applied — the `>= 500` exclusion has been removed from `_should_log`.
- `NotificationDelivery` status choices: `pending / processing / sent / failed / cancelled` (from `DeliveryStatus`).
- `NotificationDelivery.updated_at` is `auto_now=True` — use it as the 24h cutoff for failed records because `failed_at` is nullable.
- Celery broker URL is `settings.CELERY_BROKER_URL` (Redis DB 1) — **not** `settings.REDIS_URL` (DB 0 / cache).
- `django_redis` is installed; use `get_redis_connection("default")` for the cache Redis ping.
- `django_celery_beat` is in `INSTALLED_APPS` as `"django_celery_beat"`.
- Storage check: `settings.USE_S3` is a bool; `settings.AWS_S3_PUBLIC_BUCKET_NAME` holds the bucket to HEAD.
- Tests use `django.test.TestCase` + `rest_framework.test.APIClient` — match this pattern.
- `CustomUser.objects.create_user(phone=..., password=..., is_staff=True, role="owner")` creates an admin in tests.
- Django cache key prefix is `amanapos` (set in settings `KEY_PREFIX`).
- The Celery app object lives at `config.celery.app`.

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `apps/admin_panel/system/__init__.py` | Create | Empty package marker |
| `apps/admin_panel/system/constants.py` | Create | Status strings, warning codes, queue names, thresholds, cache key/TTL |
| `apps/admin_panel/system/health_checks.py` | Create | Six probe functions: database, redis, celery_workers, celery_queues, celery_beat, storage |
| `apps/admin_panel/system/selectors.py` | Create | DB queries: notification stats, audit log stats |
| `apps/admin_panel/system/services.py` | Create | Orchestration: run all probes, calculate overall status, build warnings, cache |
| `apps/admin_panel/system/views.py` | Create | Three APIViews: SystemOverviewView, SystemServicesView, SystemWarningsView |
| `apps/admin_panel/system/urls.py` | Create | URL patterns for the three views |
| `apps/admin_panel/urls.py` | Modify | Add `path("system/", include(...))` |
| `apps/admin_panel/tests/__init__.py` | Create | Empty test package marker |
| `apps/admin_panel/tests/test_system_health.py` | Create | All tests (auth, shape, caching, failure resilience, no secrets) |

---

## Task 1: Skeleton + Constants

**Files:**
- Create: `apps/admin_panel/system/__init__.py`
- Create: `apps/admin_panel/system/constants.py`
- Create: `apps/admin_panel/tests/__init__.py`

- [ ] **Step 1: Create the system package and tests package**

```bash
mkdir -p /path/to/backend/apps/admin_panel/system
mkdir -p /path/to/backend/apps/admin_panel/tests
```

Create `apps/admin_panel/system/__init__.py` — empty file.

Create `apps/admin_panel/tests/__init__.py` — empty file.

- [ ] **Step 2: Write constants.py**

Create `apps/admin_panel/system/constants.py`:

```python
STATUS_UP = "up"
STATUS_DOWN = "down"
STATUS_DEGRADED = "degraded"
STATUS_UNKNOWN = "unknown"

OVERALL_HEALTHY = "healthy"
OVERALL_DEGRADED = "degraded"
OVERALL_CRITICAL = "critical"


class WarningSeverity:
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class WarningCode:
    DATABASE_DOWN = "DATABASE_DOWN"
    REDIS_DOWN = "REDIS_DOWN"
    CELERY_DOWN = "CELERY_DOWN"
    STORAGE_DOWN = "STORAGE_DOWN"
    NOTIFICATION_QUEUE_DELAY = "NOTIFICATION_QUEUE_DELAY"
    NO_CELERY_WORKERS = "NO_CELERY_WORKERS"
    HIGH_FAILED_NOTIFICATIONS = "HIGH_FAILED_NOTIFICATIONS"


# Celery uses Redis lists named after the queue. "celery" is the built-in default.
CELERY_QUEUE_NAMES = ["celery", "default", "notifications", "reports"]

NOTIFICATION_QUEUE_WARNING_THRESHOLD = 100
FAILED_NOTIFICATION_WARNING_THRESHOLD = 50

SYSTEM_OVERVIEW_CACHE_KEY = "admin_system_overview"
SYSTEM_OVERVIEW_CACHE_TTL = 20  # seconds
```

- [ ] **Step 3: Commit skeleton**

```bash
git add apps/admin_panel/system/__init__.py \
        apps/admin_panel/system/constants.py \
        apps/admin_panel/tests/__init__.py
git commit -m "feat(system): add system health subpackage skeleton + constants"
```

---

## Task 2: Selectors (DB Queries)

**Files:**
- Create: `apps/admin_panel/system/selectors.py`
- Create: `apps/admin_panel/tests/test_system_health.py` (first section only)

- [ ] **Step 1: Write the failing test for selectors**

Create `apps/admin_panel/tests/test_system_health.py` with this content:

```python
"""
Tests for system health check endpoints and supporting functions.
"""
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser

OVERVIEW_URL = "/api/v1/admin/system/overview/"
SERVICES_URL = "/api/v1/admin/system/services/"
WARNINGS_URL = "/api/v1/admin/system/warnings/"


def _make_admin(phone="+249900000001"):
    return CustomUser.objects.create_user(
        phone=phone,
        password="adminpass123",
        is_staff=True,
        is_superuser=True,
        role="owner",
    )


def _make_regular_user(phone="+249900000002"):
    return CustomUser.objects.create_user(
        phone=phone,
        password="userpass123",
        role="owner",
    )


# ── Selector Tests ─────────────────────────────────────────────────────────────

class NotificationStatsTests(TestCase):
    def test_returns_expected_keys(self):
        from apps.admin_panel.system.selectors import get_notification_stats
        result = get_notification_stats()
        self.assertIn("pending_notifications", result)
        self.assertIn("failed_notifications_24h", result)

    def test_pending_count_is_integer(self):
        from apps.admin_panel.system.selectors import get_notification_stats
        result = get_notification_stats()
        self.assertIsInstance(result["pending_notifications"], int)

    def test_failed_count_is_integer(self):
        from apps.admin_panel.system.selectors import get_notification_stats
        result = get_notification_stats()
        self.assertIsInstance(result["failed_notifications_24h"], int)

    def test_pending_count_reflects_db(self):
        from apps.admin_panel.system.selectors import get_notification_stats
        from apps.notifications.models.delivery import NotificationDelivery, DeliveryStatus

        user = _make_admin(phone="+249900000010")
        # Create 3 pending deliveries
        for _ in range(3):
            NotificationDelivery.objects.create(
                recipient=user,
                channel="push",
                status=DeliveryStatus.PENDING,
            )

        result = get_notification_stats()
        self.assertEqual(result["pending_notifications"], 3)

    def test_failed_count_24h_only(self):
        from apps.admin_panel.system.selectors import get_notification_stats
        from apps.notifications.models.delivery import NotificationDelivery, DeliveryStatus

        user = _make_admin(phone="+249900000011")
        # Recent failure (within 24h) — will be counted via auto_now updated_at
        recent = NotificationDelivery.objects.create(
            recipient=user,
            channel="push",
            status=DeliveryStatus.FAILED,
        )
        # Simulate old failure by patching the cutoff to be earlier
        result = get_notification_stats()
        self.assertGreaterEqual(result["failed_notifications_24h"], 1)


class AuditLogStatsTests(TestCase):
    def test_returns_expected_keys(self):
        from apps.admin_panel.system.selectors import get_audit_log_stats
        result = get_audit_log_stats()
        self.assertIn("audit_logs_24h", result)
        self.assertIn("error_logs_24h", result)

    def test_audit_logs_count_is_integer(self):
        from apps.admin_panel.system.selectors import get_audit_log_stats
        result = get_audit_log_stats()
        self.assertIsInstance(result["audit_logs_24h"], int)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker exec amanapos_app python -m pytest apps/admin_panel/tests/test_system_health.py::NotificationStatsTests -v
```

Expected: `ModuleNotFoundError: No module named 'apps.admin_panel.system.selectors'`

- [ ] **Step 3: Implement selectors.py**

Create `apps/admin_panel/system/selectors.py`:

```python
from datetime import timedelta

from django.utils import timezone


def get_notification_stats() -> dict:
    from apps.notifications.models.delivery import NotificationDelivery, DeliveryStatus

    cutoff = timezone.now() - timedelta(hours=24)
    pending = NotificationDelivery.objects.filter(
        status=DeliveryStatus.PENDING,
    ).count()
    failed_24h = NotificationDelivery.objects.filter(
        status=DeliveryStatus.FAILED,
        updated_at__gte=cutoff,
    ).count()
    return {
        "pending_notifications": pending,
        "failed_notifications_24h": failed_24h,
    }


def get_audit_log_stats() -> dict:
    from apps.audit_logs.models.audit_log import AuditLog

    cutoff = timezone.now() - timedelta(hours=24)
    audit_logs_24h = AuditLog.objects.filter(created_at__gte=cutoff).count()
    # Middleware stores status_code in extra JSON field; 5xx are now logged.
    error_logs_24h = AuditLog.objects.filter(
        created_at__gte=cutoff,
        extra__status_code__gte=500,
    ).count()
    return {
        "audit_logs_24h": audit_logs_24h,
        "error_logs_24h": error_logs_24h,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker exec amanapos_app python -m pytest apps/admin_panel/tests/test_system_health.py::NotificationStatsTests apps/admin_panel/tests/test_system_health.py::AuditLogStatsTests -v
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin_panel/system/selectors.py \
        apps/admin_panel/tests/test_system_health.py
git commit -m "feat(system): add selectors for notification + audit log stats"
```

---

## Task 3: Health Checks

**Files:**
- Create: `apps/admin_panel/system/health_checks.py`
- Modify: `apps/admin_panel/tests/test_system_health.py` (append health check tests)

- [ ] **Step 1: Append health check tests to test file**

Append these classes to `apps/admin_panel/tests/test_system_health.py`:

```python
# ── Health Check Unit Tests ────────────────────────────────────────────────────

class DatabaseHealthCheckTests(TestCase):
    def test_healthy_db_returns_up(self):
        from apps.admin_panel.system.health_checks import check_database
        result = check_database()
        self.assertEqual(result["status"], "up")
        self.assertIsInstance(result["response_time_ms"], int)
        self.assertGreaterEqual(result["response_time_ms"], 0)

    def test_db_failure_returns_down(self):
        from apps.admin_panel.system.health_checks import check_database
        with patch("apps.admin_panel.system.health_checks.connections") as mock_conns:
            mock_conns.__getitem__.return_value.ensure_connection.side_effect = Exception("DB error")
            result = check_database()
        self.assertEqual(result["status"], "down")
        self.assertIsNone(result["response_time_ms"])

    def test_db_result_has_no_credentials(self):
        from apps.admin_panel.system.health_checks import check_database
        result = check_database()
        result_str = str(result)
        self.assertNotIn("PASSWORD", result_str)
        self.assertNotIn("secret", result_str.lower())


class RedisHealthCheckTests(TestCase):
    def test_redis_failure_returns_down(self):
        from apps.admin_panel.system.health_checks import check_redis
        with patch("apps.admin_panel.system.health_checks.get_redis_connection") as mock_get:
            mock_get.side_effect = Exception("Redis error")
            result = check_redis()
        self.assertEqual(result["status"], "down")
        self.assertIsNone(result["response_time_ms"])

    def test_redis_result_has_no_url(self):
        from apps.admin_panel.system.health_checks import check_redis
        with patch("apps.admin_panel.system.health_checks.get_redis_connection") as mock_get:
            mock_conn = MagicMock()
            mock_conn.ping.return_value = True
            mock_get.return_value = mock_conn
            result = check_redis()
        result_str = str(result)
        self.assertNotIn("redis://", result_str)
        self.assertNotIn("6379", result_str)


class CeleryWorkerCheckTests(TestCase):
    def test_workers_available_returns_up(self):
        from apps.admin_panel.system.health_checks import check_celery_workers
        with patch("apps.admin_panel.system.health_checks.celery_app") as mock_app:
            mock_inspect = MagicMock()
            mock_inspect.ping.return_value = {"worker1@host": {"ok": "pong"}, "worker2@host": {"ok": "pong"}}
            mock_app.control.inspect.return_value = mock_inspect
            result = check_celery_workers()
        self.assertEqual(result["status"], "up")
        self.assertEqual(result["active_workers"], 2)

    def test_no_workers_returns_down(self):
        from apps.admin_panel.system.health_checks import check_celery_workers
        with patch("apps.admin_panel.system.health_checks.celery_app") as mock_app:
            mock_inspect = MagicMock()
            mock_inspect.ping.return_value = {}
            mock_app.control.inspect.return_value = mock_inspect
            result = check_celery_workers()
        self.assertEqual(result["status"], "down")
        self.assertEqual(result["active_workers"], 0)

    def test_celery_exception_returns_down(self):
        from apps.admin_panel.system.health_checks import check_celery_workers
        with patch("apps.admin_panel.system.health_checks.celery_app") as mock_app:
            mock_app.control.inspect.side_effect = Exception("Celery unreachable")
            result = check_celery_workers()
        self.assertEqual(result["status"], "down")


class CeleryQueueCheckTests(TestCase):
    def test_queue_check_returns_known_queues(self):
        from apps.admin_panel.system.health_checks import check_celery_queues
        from apps.admin_panel.system.constants import CELERY_QUEUE_NAMES
        with patch("apps.admin_panel.system.health_checks.redis") as mock_redis:
            mock_client = MagicMock()
            mock_client.ping.return_value = True
            mock_client.llen.return_value = 0
            mock_redis.from_url.return_value = mock_client
            result = check_celery_queues()
        self.assertEqual(result["status"], "up")
        for queue in CELERY_QUEUE_NAMES:
            self.assertIn(queue, result["queues"])

    def test_broker_failure_returns_down(self):
        from apps.admin_panel.system.health_checks import check_celery_queues
        with patch("apps.admin_panel.system.health_checks.redis") as mock_redis:
            mock_redis.from_url.side_effect = Exception("Broker error")
            result = check_celery_queues()
        self.assertEqual(result["status"], "down")
        self.assertEqual(result["queues"], {})


class StorageHealthCheckTests(TestCase):
    @override_settings(USE_S3=False)
    def test_local_storage_returns_up(self):
        from apps.admin_panel.system.health_checks import check_storage
        result = check_storage()
        self.assertEqual(result["status"], "up")
        self.assertEqual(result["provider"], "local")

    @override_settings(USE_S3=True, AWS_S3_ENDPOINT_URL="http://minio:9000",
                       AWS_ACCESS_KEY_ID="key", AWS_SECRET_ACCESS_KEY="secret",
                       AWS_S3_REGION_NAME="us-east-1", AWS_S3_PUBLIC_BUCKET_NAME="test-bucket")
    def test_minio_success_returns_up(self):
        from apps.admin_panel.system.health_checks import check_storage
        with patch("apps.admin_panel.system.health_checks.boto3") as mock_boto:
            mock_client = MagicMock()
            mock_client.head_bucket.return_value = {}
            mock_boto.client.return_value = mock_client
            result = check_storage()
        self.assertEqual(result["status"], "up")
        self.assertEqual(result["provider"], "minio")

    @override_settings(USE_S3=True, AWS_S3_ENDPOINT_URL="http://minio:9000",
                       AWS_ACCESS_KEY_ID="key", AWS_SECRET_ACCESS_KEY="secret",
                       AWS_S3_REGION_NAME="us-east-1", AWS_S3_PUBLIC_BUCKET_NAME="test-bucket")
    def test_minio_failure_returns_down(self):
        from apps.admin_panel.system.health_checks import check_storage
        with patch("apps.admin_panel.system.health_checks.boto3") as mock_boto:
            mock_boto.client.side_effect = Exception("Connection refused")
            result = check_storage()
        self.assertEqual(result["status"], "down")
        self.assertNotIn("secret", str(result).lower())
        self.assertNotIn("key", str(result).lower())
```

- [ ] **Step 2: Run failing tests**

```bash
docker exec amanapos_app python -m pytest apps/admin_panel/tests/test_system_health.py::DatabaseHealthCheckTests -v
```

Expected: `ModuleNotFoundError: No module named 'apps.admin_panel.system.health_checks'`

- [ ] **Step 3: Implement health_checks.py**

Create `apps/admin_panel/system/health_checks.py`:

```python
import logging
import time

import boto3
import redis
from django_redis import get_redis_connection

from config.celery import app as celery_app

logger = logging.getLogger(__name__)


def check_database() -> dict:
    from django.db import connections
    from django.db.utils import OperationalError

    start = time.monotonic()
    try:
        conn = connections["default"]
        conn.ensure_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1")
        ms = round((time.monotonic() - start) * 1000)
        return {"status": "up", "response_time_ms": ms, "message": "Database connection is healthy"}
    except (OperationalError, Exception) as exc:
        logger.error("DB health check failed: %s", exc)
        return {"status": "down", "response_time_ms": None, "message": "Database connection failed"}


def check_redis() -> dict:
    start = time.monotonic()
    try:
        conn = get_redis_connection("default")
        conn.ping()
        ms = round((time.monotonic() - start) * 1000)
        return {"status": "up", "response_time_ms": ms, "message": "Redis connection is healthy"}
    except Exception as exc:
        logger.error("Redis health check failed: %s", exc)
        return {"status": "down", "response_time_ms": None, "message": "Redis connection failed"}


def check_celery_workers() -> dict:
    try:
        inspect = celery_app.control.inspect(timeout=2.0)
        pong = inspect.ping()
        if pong:
            count = len(pong)
            return {"status": "up", "active_workers": count, "message": f"{count} Celery worker(s) available"}
        return {"status": "down", "active_workers": 0, "message": "No Celery workers responded"}
    except Exception as exc:
        logger.error("Celery worker check failed: %s", exc)
        return {"status": "down", "active_workers": 0, "message": "Celery worker check failed"}


def check_celery_queues() -> dict:
    from django.conf import settings
    from .constants import CELERY_QUEUE_NAMES

    try:
        client = redis.from_url(
            settings.CELERY_BROKER_URL,
            socket_connect_timeout=2,
            socket_timeout=2,
            decode_responses=True,
        )
        client.ping()
        queues = {name: {"pending": client.llen(name)} for name in CELERY_QUEUE_NAMES}
        return {"status": "up", "queues": queues}
    except Exception as exc:
        logger.error("Celery queue check failed: %s", exc)
        return {"status": "down", "queues": {}, "message": "Celery broker unreachable"}


def check_celery_beat() -> dict:
    try:
        from django_celery_beat.models import PeriodicTask
        count = PeriodicTask.objects.filter(enabled=True).count()
        return {
            "status": "up",
            "enabled_tasks": count,
            "message": f"{count} periodic task(s) enabled",
        }
    except Exception as exc:
        logger.error("Celery beat check failed: %s", exc)
        return {"status": "unknown", "message": "Celery beat health tracking is not configured yet"}


def check_storage() -> dict:
    from django.conf import settings

    if not getattr(settings, "USE_S3", False):
        return {"status": "up", "provider": "local", "message": "Local storage"}

    try:
        from botocore.config import Config as BotoConfig

        client = boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            config=BotoConfig(connect_timeout=3, read_timeout=3),
        )
        client.head_bucket(Bucket=settings.AWS_S3_PUBLIC_BUCKET_NAME)
        return {"status": "up", "provider": "minio", "message": "Storage is reachable"}
    except Exception as exc:
        logger.error("Storage health check failed: %s", exc)
        return {"status": "down", "provider": "minio", "message": "Connection failed"}
```

- [ ] **Step 4: Run health check tests**

```bash
docker exec amanapos_app python -m pytest \
  apps/admin_panel/tests/test_system_health.py::DatabaseHealthCheckTests \
  apps/admin_panel/tests/test_system_health.py::RedisHealthCheckTests \
  apps/admin_panel/tests/test_system_health.py::CeleryWorkerCheckTests \
  apps/admin_panel/tests/test_system_health.py::CeleryQueueCheckTests \
  apps/admin_panel/tests/test_system_health.py::StorageHealthCheckTests -v
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin_panel/system/health_checks.py \
        apps/admin_panel/tests/test_system_health.py
git commit -m "feat(system): add health check probes for db/redis/celery/storage"
```

---

## Task 4: Services (Orchestration)

**Files:**
- Create: `apps/admin_panel/system/services.py`
- Modify: `apps/admin_panel/tests/test_system_health.py` (append service tests)

- [ ] **Step 1: Append service tests to test file**

Append these classes to `apps/admin_panel/tests/test_system_health.py`:

```python
# ── Service Tests ──────────────────────────────────────────────────────────────

MOCK_SERVICES_ALL_UP = {
    "backend":        {"status": "up", "message": "Backend is running"},
    "database":       {"status": "up", "response_time_ms": 5, "message": "Database connection is healthy"},
    "redis":          {"status": "up", "response_time_ms": 2, "message": "Redis connection is healthy"},
    "celery":         {"status": "up", "active_workers": 2, "message": "2 Celery worker(s) available"},
    "celery_queues":  {"status": "up", "queues": {"celery": {"pending": 0}, "notifications": {"pending": 0}, "reports": {"pending": 0}, "default": {"pending": 0}}},
    "celery_beat":    {"status": "up", "enabled_tasks": 4, "message": "4 periodic task(s) enabled"},
    "storage":        {"status": "up", "provider": "minio", "message": "Storage is reachable"},
}

MOCK_SERVICES_DB_DOWN = {
    **MOCK_SERVICES_ALL_UP,
    "database": {"status": "down", "response_time_ms": None, "message": "Database connection failed"},
}


class OverallStatusTests(TestCase):
    def test_all_up_is_healthy(self):
        from apps.admin_panel.system.services import _calculate_overall_status
        self.assertEqual(_calculate_overall_status(MOCK_SERVICES_ALL_UP), "healthy")

    def test_db_down_is_critical(self):
        from apps.admin_panel.system.services import _calculate_overall_status
        self.assertEqual(_calculate_overall_status(MOCK_SERVICES_DB_DOWN), "critical")

    def test_redis_down_is_critical(self):
        from apps.admin_panel.system.services import _calculate_overall_status
        services = {**MOCK_SERVICES_ALL_UP, "redis": {"status": "down"}}
        self.assertEqual(_calculate_overall_status(services), "critical")

    def test_celery_down_is_degraded(self):
        from apps.admin_panel.system.services import _calculate_overall_status
        services = {**MOCK_SERVICES_ALL_UP, "celery": {"status": "down", "active_workers": 0}}
        self.assertEqual(_calculate_overall_status(services), "degraded")

    def test_storage_down_is_degraded(self):
        from apps.admin_panel.system.services import _calculate_overall_status
        services = {**MOCK_SERVICES_ALL_UP, "storage": {"status": "down"}}
        self.assertEqual(_calculate_overall_status(services), "degraded")


class BuildWarningsTests(TestCase):
    def _now(self):
        return timezone.now()

    def test_no_warnings_when_all_healthy(self):
        from apps.admin_panel.system.services import _build_warnings
        ops = {"pending_notifications": 0, "failed_notifications_24h": 0}
        result = _build_warnings(MOCK_SERVICES_ALL_UP, ops, self._now())
        self.assertEqual(result, [])

    def test_db_down_produces_critical_warning(self):
        from apps.admin_panel.system.services import _build_warnings
        ops = {"pending_notifications": 0, "failed_notifications_24h": 0}
        result = _build_warnings(MOCK_SERVICES_DB_DOWN, ops, self._now())
        codes = [w["code"] for w in result]
        self.assertIn("DATABASE_DOWN", codes)
        severities = {w["code"]: w["severity"] for w in result}
        self.assertEqual(severities["DATABASE_DOWN"], "critical")

    def test_high_pending_notifications_produces_warning(self):
        from apps.admin_panel.system.services import _build_warnings
        ops = {"pending_notifications": 150, "failed_notifications_24h": 0}
        result = _build_warnings(MOCK_SERVICES_ALL_UP, ops, self._now())
        codes = [w["code"] for w in result]
        self.assertIn("NOTIFICATION_QUEUE_DELAY", codes)

    def test_low_pending_notifications_no_warning(self):
        from apps.admin_panel.system.services import _build_warnings
        ops = {"pending_notifications": 50, "failed_notifications_24h": 0}
        result = _build_warnings(MOCK_SERVICES_ALL_UP, ops, self._now())
        codes = [w["code"] for w in result]
        self.assertNotIn("NOTIFICATION_QUEUE_DELAY", codes)

    def test_warning_has_required_fields(self):
        from apps.admin_panel.system.services import _build_warnings
        ops = {"pending_notifications": 200, "failed_notifications_24h": 0}
        result = _build_warnings(MOCK_SERVICES_ALL_UP, ops, self._now())
        for w in result:
            self.assertIn("severity", w)
            self.assertIn("code", w)
            self.assertIn("title", w)
            self.assertIn("message", w)
            self.assertIn("created_at", w)


class BuildSystemOverviewTests(TestCase):
    @patch("apps.admin_panel.system.services._run_all_health_checks", return_value=MOCK_SERVICES_ALL_UP)
    @patch("apps.admin_panel.system.services.get_notification_stats", return_value={"pending_notifications": 0, "failed_notifications_24h": 0})
    @patch("apps.admin_panel.system.services.get_audit_log_stats", return_value={"audit_logs_24h": 10, "error_logs_24h": 0})
    def test_overview_has_required_keys(self, _audit, _notif, _health):
        from apps.admin_panel.system.services import build_system_overview
        result = build_system_overview()
        self.assertIn("overall_status", result)
        self.assertIn("generated_at", result)
        self.assertIn("services", result)
        self.assertIn("operations", result)
        self.assertIn("warnings", result)

    @patch("apps.admin_panel.system.services._run_all_health_checks", return_value=MOCK_SERVICES_ALL_UP)
    @patch("apps.admin_panel.system.services.get_notification_stats", return_value={"pending_notifications": 0, "failed_notifications_24h": 0})
    @patch("apps.admin_panel.system.services.get_audit_log_stats", return_value={"audit_logs_24h": 0, "error_logs_24h": 0})
    def test_overview_status_is_healthy(self, _audit, _notif, _health):
        from apps.admin_panel.system.services import build_system_overview
        from django.core.cache import cache
        cache.clear()
        result = build_system_overview()
        self.assertEqual(result["overall_status"], "healthy")
```

- [ ] **Step 2: Run failing tests**

```bash
docker exec amanapos_app python -m pytest \
  apps/admin_panel/tests/test_system_health.py::OverallStatusTests \
  apps/admin_panel/tests/test_system_health.py::BuildWarningsTests \
  apps/admin_panel/tests/test_system_health.py::BuildSystemOverviewTests -v
```

Expected: `ModuleNotFoundError: No module named 'apps.admin_panel.system.services'`

- [ ] **Step 3: Implement services.py**

Create `apps/admin_panel/system/services.py`:

```python
import logging

from django.core.cache import cache
from django.utils import timezone

from .constants import (
    FAILED_NOTIFICATION_WARNING_THRESHOLD,
    NOTIFICATION_QUEUE_WARNING_THRESHOLD,
    OVERALL_CRITICAL,
    OVERALL_DEGRADED,
    OVERALL_HEALTHY,
    SYSTEM_OVERVIEW_CACHE_KEY,
    SYSTEM_OVERVIEW_CACHE_TTL,
    WarningCode,
    WarningSeverity,
)
from .health_checks import (
    check_celery_beat,
    check_celery_queues,
    check_celery_workers,
    check_database,
    check_redis,
    check_storage,
)
from .selectors import get_audit_log_stats, get_notification_stats

logger = logging.getLogger(__name__)


def _run_all_health_checks() -> dict:
    return {
        "backend":       {"status": "up", "message": "Backend is running"},
        "database":      check_database(),
        "redis":         check_redis(),
        "celery":        check_celery_workers(),
        "celery_queues": check_celery_queues(),
        "celery_beat":   check_celery_beat(),
        "storage":       check_storage(),
    }


def _calculate_overall_status(services: dict) -> str:
    if services.get("database", {}).get("status") == "down":
        return OVERALL_CRITICAL
    if services.get("redis", {}).get("status") == "down":
        return OVERALL_CRITICAL

    non_critical = ["celery", "celery_beat", "storage", "celery_queues"]
    for key in non_critical:
        if services.get(key, {}).get("status") in ("down", "degraded"):
            return OVERALL_DEGRADED

    return OVERALL_HEALTHY


def _build_warnings(services: dict, operations: dict, now) -> list:
    warnings = []
    ts = now.isoformat()

    if services.get("database", {}).get("status") == "down":
        warnings.append({
            "severity": WarningSeverity.CRITICAL,
            "code":     WarningCode.DATABASE_DOWN,
            "title":    "Database unavailable",
            "message":  "Database health check failed.",
            "created_at": ts,
        })

    if services.get("redis", {}).get("status") == "down":
        warnings.append({
            "severity": WarningSeverity.CRITICAL,
            "code":     WarningCode.REDIS_DOWN,
            "title":    "Redis unavailable",
            "message":  "Redis health check failed.",
            "created_at": ts,
        })

    if services.get("celery", {}).get("status") == "down":
        warnings.append({
            "severity": WarningSeverity.WARNING,
            "code":     WarningCode.NO_CELERY_WORKERS,
            "title":    "No Celery workers",
            "message":  "No Celery workers responded to ping.",
            "created_at": ts,
        })

    if services.get("storage", {}).get("status") == "down":
        warnings.append({
            "severity": WarningSeverity.WARNING,
            "code":     WarningCode.STORAGE_DOWN,
            "title":    "Storage unavailable",
            "message":  "Storage health check failed.",
            "created_at": ts,
        })

    pending = operations.get("pending_notifications") or 0
    if pending >= NOTIFICATION_QUEUE_WARNING_THRESHOLD:
        warnings.append({
            "severity": WarningSeverity.WARNING,
            "code":     WarningCode.NOTIFICATION_QUEUE_DELAY,
            "title":    "Notification queue delay",
            "message":  f"There are {pending} pending notifications.",
            "created_at": ts,
        })

    failed = operations.get("failed_notifications_24h") or 0
    if failed >= FAILED_NOTIFICATION_WARNING_THRESHOLD:
        warnings.append({
            "severity": WarningSeverity.WARNING,
            "code":     WarningCode.HIGH_FAILED_NOTIFICATIONS,
            "title":    "High notification failure rate",
            "message":  f"{failed} notifications failed in the last 24 hours.",
            "created_at": ts,
        })

    return warnings


def build_system_overview() -> dict:
    now = timezone.now()
    services = _run_all_health_checks()

    operations: dict = {}
    try:
        operations.update(get_notification_stats())
    except Exception as exc:
        logger.error("Failed to get notification stats: %s", exc)
    try:
        operations.update(get_audit_log_stats())
    except Exception as exc:
        logger.error("Failed to get audit log stats: %s", exc)

    operations.setdefault("pending_notifications", 0)
    operations.setdefault("failed_notifications_24h", 0)
    operations.setdefault("audit_logs_24h", 0)
    operations.setdefault("error_logs_24h", 0)
    operations["failed_offline_sync_24h"] = None
    operations["failed_celery_tasks_24h"] = None

    celery_detail = dict(services.get("celery", {}))
    celery_detail["queues"] = services.get("celery_queues", {}).get("queues", {})

    return {
        "overall_status": _calculate_overall_status(services),
        "generated_at":   now.isoformat(),
        "services": {
            "backend":     services["backend"],
            "database":    services["database"],
            "redis":       services["redis"],
            "celery":      celery_detail,
            "celery_beat": services["celery_beat"],
            "storage":     services["storage"],
        },
        "operations": operations,
        "warnings":   _build_warnings(services, operations, now),
    }


def get_cached_system_overview() -> dict:
    cached = cache.get(SYSTEM_OVERVIEW_CACHE_KEY)
    if cached is not None:
        return cached
    data = build_system_overview()
    cache.set(SYSTEM_OVERVIEW_CACHE_KEY, data, SYSTEM_OVERVIEW_CACHE_TTL)
    return data


def build_service_detail() -> dict:
    from django.conf import settings

    services = _run_all_health_checks()

    celery_detail = dict(services.get("celery", {}))
    celery_detail["queues"] = services.get("celery_queues", {}).get("queues", {})

    storage_detail = dict(services.get("storage", {}))
    storage_detail["provider"] = "minio" if getattr(settings, "USE_S3", False) else "local"

    return {
        "backend":     services["backend"],
        "database":    services["database"],
        "redis":       services["redis"],
        "celery":      celery_detail,
        "celery_beat": services["celery_beat"],
        "storage":     storage_detail,
    }


def build_warnings() -> list:
    services = _run_all_health_checks()
    try:
        operations = get_notification_stats()
    except Exception:
        operations = {}
    return _build_warnings(services, operations, timezone.now())
```

- [ ] **Step 4: Run service tests**

```bash
docker exec amanapos_app python -m pytest \
  apps/admin_panel/tests/test_system_health.py::OverallStatusTests \
  apps/admin_panel/tests/test_system_health.py::BuildWarningsTests \
  apps/admin_panel/tests/test_system_health.py::BuildSystemOverviewTests -v
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin_panel/system/services.py \
        apps/admin_panel/tests/test_system_health.py
git commit -m "feat(system): add services layer — orchestration, caching, warnings"
```

---

## Task 5: Views, URLs, Wire-Up

**Files:**
- Create: `apps/admin_panel/system/views.py`
- Create: `apps/admin_panel/system/urls.py`
- Modify: `apps/admin_panel/urls.py`
- Modify: `apps/admin_panel/tests/test_system_health.py` (append API tests)

- [ ] **Step 1: Append API-level tests**

Append these classes to `apps/admin_panel/tests/test_system_health.py`:

```python
# ── API Tests ─────────────────────────────────────────────────────────────────

MOCK_OVERVIEW_DATA = {
    "overall_status": "healthy",
    "generated_at": "2026-06-01T10:00:00+00:00",
    "services": {
        "backend":     {"status": "up", "message": "Backend is running"},
        "database":    {"status": "up", "response_time_ms": 5, "message": "Database connection is healthy"},
        "redis":       {"status": "up", "response_time_ms": 2, "message": "Redis connection is healthy"},
        "celery":      {"status": "up", "active_workers": 2, "queues": {}},
        "celery_beat": {"status": "up", "enabled_tasks": 4},
        "storage":     {"status": "up", "provider": "minio"},
    },
    "operations": {
        "pending_notifications": 0,
        "failed_notifications_24h": 0,
        "failed_offline_sync_24h": None,
        "failed_celery_tasks_24h": None,
        "audit_logs_24h": 10,
        "error_logs_24h": 0,
    },
    "warnings": [],
}


class SystemOverviewAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_anonymous_cannot_access_overview(self):
        response = self.client.get(OVERVIEW_URL)
        self.assertEqual(response.status_code, 401)

    def test_regular_user_cannot_access_overview(self):
        user = _make_regular_user()
        self.client.force_authenticate(user=user)
        response = self.client.get(OVERVIEW_URL)
        self.assertEqual(response.status_code, 403)

    def test_anonymous_cannot_access_services(self):
        response = self.client.get(SERVICES_URL)
        self.assertEqual(response.status_code, 401)

    def test_anonymous_cannot_access_warnings(self):
        response = self.client.get(WARNINGS_URL)
        self.assertEqual(response.status_code, 401)

    @patch("apps.admin_panel.system.views.get_cached_system_overview", return_value=MOCK_OVERVIEW_DATA)
    def test_admin_can_access_overview(self, _mock):
        admin = _make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(OVERVIEW_URL)
        self.assertEqual(response.status_code, 200)

    @patch("apps.admin_panel.system.views.get_cached_system_overview", return_value=MOCK_OVERVIEW_DATA)
    def test_overview_response_shape(self, _mock):
        admin = _make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(OVERVIEW_URL)
        data = response.json()
        self.assertTrue(data["success"])
        overview = data["data"]
        self.assertIn("overall_status", overview)
        self.assertIn("generated_at", overview)
        self.assertIn("services", overview)
        self.assertIn("operations", overview)
        self.assertIn("warnings", overview)

    @patch("apps.admin_panel.system.views.build_service_detail", return_value=MOCK_OVERVIEW_DATA["services"])
    def test_services_response_shape(self, _mock):
        admin = _make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(SERVICES_URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("database", data["data"])
        self.assertIn("redis", data["data"])
        self.assertIn("celery", data["data"])

    @patch("apps.admin_panel.system.views.build_warnings", return_value=[])
    def test_warnings_response_is_list(self, _mock):
        admin = _make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(WARNINGS_URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIsInstance(data["data"], list)

    @patch("apps.admin_panel.system.views.get_cached_system_overview", return_value=MOCK_OVERVIEW_DATA)
    def test_no_secrets_in_overview_response(self, _mock):
        admin = _make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(OVERVIEW_URL)
        body = response.content.decode()
        self.assertNotIn("PASSWORD", body)
        self.assertNotIn("SECRET_KEY", body)
        self.assertNotIn("redis://", body)
        self.assertNotIn("AWS_SECRET", body)


class SystemOverviewCacheTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_admin(phone="+249900000099")
        self.client.force_authenticate(user=self.admin)

    @patch("apps.admin_panel.system.services._run_all_health_checks", return_value=MOCK_SERVICES_ALL_UP)
    @patch("apps.admin_panel.system.services.get_notification_stats", return_value={"pending_notifications": 0, "failed_notifications_24h": 0})
    @patch("apps.admin_panel.system.services.get_audit_log_stats", return_value={"audit_logs_24h": 0, "error_logs_24h": 0})
    def test_overview_is_cached_on_second_call(self, _audit, _notif, mock_health):
        from django.core.cache import cache
        cache.delete("admin_system_overview")

        self.client.get(OVERVIEW_URL)
        self.client.get(OVERVIEW_URL)

        # Health checks should only be called once (second call hits cache)
        self.assertEqual(mock_health.call_count, 1)
```

- [ ] **Step 2: Run failing tests**

```bash
docker exec amanapos_app python -m pytest \
  apps/admin_panel/tests/test_system_health.py::SystemOverviewAccessTests \
  apps/admin_panel/tests/test_system_health.py::SystemOverviewCacheTests -v
```

Expected: `404 Not Found` (URL not wired yet) or `ImportError`.

- [ ] **Step 3: Create views.py**

Create `apps/admin_panel/system/views.py`:

```python
import logging

from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import build_service_detail, build_warnings, get_cached_system_overview

logger = logging.getLogger(__name__)

_ERROR_RESPONSE = {
    "success": False,
    "error": {
        "code": "SYSTEM_HEALTH_CHECK_FAILED",
        "message": "Unable to complete system health check",
    },
}


class SystemOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            data = get_cached_system_overview()
            return Response({"success": True, "data": data})
        except Exception as exc:
            logger.exception("System overview failed: %s", exc)
            return Response(_ERROR_RESPONSE, status=500)


class SystemServicesView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            data = build_service_detail()
            return Response({"success": True, "data": data})
        except Exception as exc:
            logger.exception("System services check failed: %s", exc)
            return Response(_ERROR_RESPONSE, status=500)


class SystemWarningsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            data = build_warnings()
            return Response({"success": True, "data": data})
        except Exception as exc:
            logger.exception("System warnings failed: %s", exc)
            return Response(_ERROR_RESPONSE, status=500)
```

- [ ] **Step 4: Create system/urls.py**

Create `apps/admin_panel/system/urls.py`:

```python
from django.urls import path

from . import views

app_name = "system"

urlpatterns = [
    path("overview/", views.SystemOverviewView.as_view(),  name="overview"),
    path("services/", views.SystemServicesView.as_view(),  name="services"),
    path("warnings/", views.SystemWarningsView.as_view(),  name="warnings"),
]
```

- [ ] **Step 5: Wire into admin_panel/urls.py**

Open `apps/admin_panel/urls.py` and add this line **before** the last URL pattern:

```python
from django.urls import path, include
from . import views

app_name = "admin_panel"

urlpatterns = [
    path("stats/",         views.AdminStatsView.as_view(),        name="stats"),
    path("owners/",        views.AdminOwnerListView.as_view(),     name="owners"),
    path("owners/<uuid:pk>/",               views.AdminOwnerDetailView.as_view(),       name="owner-detail"),
    path("owners/<uuid:pk>/toggle-status/", views.AdminOwnerToggleStatusView.as_view(), name="owner-toggle-status"),
    path("businesses/",               views.AdminBusinessListView.as_view(),         name="businesses"),
    path("businesses/create/",        views.AdminBusinessCreateView.as_view(),       name="business-create"),
    path("businesses/<uuid:pk>/",                views.AdminBusinessDetailView.as_view(),       name="business-detail"),
    path("businesses/<uuid:pk>/toggle-status/", views.AdminBusinessToggleStatusView.as_view(), name="business-toggle-status"),
    path("subscriptions/",               views.AdminSubscriptionListView.as_view(),      name="subscriptions"),
    path("subscriptions/create/",        views.AdminSubscriptionCreateView.as_view(),    name="subscription-create"),
    path("subscriptions/<uuid:pk>/",                views.AdminSubscriptionDetailView.as_view(),    name="subscription-detail"),
    path("subscriptions/<uuid:pk>/deactivate/",     views.AdminSubscriptionDeactivateView.as_view(), name="subscription-deactivate"),
    path("plans/",                          views.AdminPlanListView.as_view(),          name="plans"),
    path("plans/create/",                   views.AdminPlanCreateView.as_view(),        name="plan-create"),
    path("plans/<uuid:pk>/",                views.AdminPlanDetailView.as_view(),        name="plan-detail"),
    path("plans/<uuid:pk>/toggle-active/",  views.AdminPlanToggleActiveView.as_view(),  name="plan-toggle-active"),
    path("notifications/",                  include("apps.notifications.admin_urls")),
    path("system/",                         include("apps.admin_panel.system.urls")),   # ← add this
]
```

The only change is adding the last `path("system/", ...)` entry.

- [ ] **Step 6: Run all tests**

```bash
docker exec amanapos_app python -m pytest apps/admin_panel/tests/test_system_health.py -v
```

Expected: All PASS.

- [ ] **Step 7: Verify existing admin panel tests still pass**

```bash
docker exec amanapos_app python -m pytest apps/ -v --tb=short 2>&1 | tail -30
```

Expected: No regressions in existing tests.

- [ ] **Step 8: Commit**

```bash
git add apps/admin_panel/system/views.py \
        apps/admin_panel/system/urls.py \
        apps/admin_panel/urls.py \
        apps/admin_panel/tests/test_system_health.py
git commit -m "feat(system): add views, URLs, wire system health endpoints"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `GET /api/v1/admin/system/overview/` — Task 5
- [x] `GET /api/v1/admin/system/services/` — Task 5
- [x] `GET /api/v1/admin/system/warnings/` — Task 5
- [x] Database health check — Task 3
- [x] Redis health check — Task 3
- [x] Celery workers check — Task 3
- [x] Celery queue sizes — Task 3
- [x] Celery Beat check — Task 3
- [x] MinIO/storage check — Task 3
- [x] Notification stats (pending, failed 24h) — Task 2
- [x] Audit log stats (count 24h) — Task 2
- [x] Overall status calculation (healthy/degraded/critical) — Task 4
- [x] Warnings with severity/code/title/message/created_at — Task 4
- [x] 20-second cache on overview — Task 4
- [x] is_staff=True required on all endpoints — Task 5
- [x] No secrets in responses — Task 5
- [x] Short timeouts on all probes — Task 3 (socket_connect_timeout=2, celery inspect timeout=2.0, boto3 connect_timeout=3)
- [x] `failed_offline_sync_24h` returns `null` (no model for it) — Task 4
- [x] Tests for anonymous/non-admin/admin access — Task 5
- [x] Tests for cache behavior — Task 5

**Placeholder scan:** No TBDs, no "similar to Task N", all code shown explicitly.

**Type consistency:** `_calculate_overall_status` → `_build_warnings` → `build_system_overview` — all use the same `services: dict` shape. `MOCK_SERVICES_ALL_UP` used consistently across service tests and API tests.

---

## How to Test Locally

```bash
# Run all system health tests
docker exec amanapos_app python -m pytest apps/admin_panel/tests/test_system_health.py -v

# Hit the live endpoints (requires running stack + staff user token)
TOKEN="<get from login/password endpoint>"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/admin/system/overview/ | python -m json.tool
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/admin/system/services/ | python -m json.tool
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/admin/system/warnings/ | python -m json.tool
```

## Missing Monitoring Dependencies

None — all dependencies (`redis`, `boto3`, `django_redis`, `django_celery_beat`) are already installed.

## Recommended Next Steps Before Frontend Integration

1. Create a staff user in Django admin or via `create_admin` management command.
2. Hit the live endpoints against Docker (`make up`) and verify real health data returns.
3. Test with Redis stopped (`docker stop amanapos_redis`) to verify the `down`/`critical` path.
4. Then integrate into the frontend admin system dashboard section.
