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
