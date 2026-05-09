import logging

logger = logging.getLogger(__name__)


def log_activity(
    *,
    actor,
    action: str,
    entity_type: str,
    entity_id="",
    entity_label: str = "",
    description: str = "",
    metadata: dict | None = None,
    request=None,
) -> None:
    """
    Record a high-level admin activity event. Fire-and-forget — never raises.
    """
    try:
        from .models import ActivityLog

        ip = None
        if request:
            forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
            ip = forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")

        ActivityLog.objects.create(
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else "",
            entity_label=entity_label,
            description=description,
            metadata=metadata or {},
            ip_address=ip,
        )
    except Exception as exc:
        logger.warning("[activity_logs] Failed to log activity: %s", exc)
