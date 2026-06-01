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
