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

    if services.get("celery", {}).get("status") in ("down", "degraded"):
        warnings.append({
            "severity": WarningSeverity.WARNING,
            "code":     WarningCode.NO_CELERY_WORKERS,
            "title":    "Celery worker issue",
            "message":  services.get("celery", {}).get("message", "Celery workers unavailable."),
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
