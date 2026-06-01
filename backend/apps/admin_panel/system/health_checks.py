import logging
import time

import redis
from django.db import connections
from django_redis import get_redis_connection

from config.celery import app as celery_app

logger = logging.getLogger(__name__)


def check_database() -> dict:
    start = time.monotonic()
    try:
        conn = connections["default"]
        conn.ensure_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1")
        ms = round((time.monotonic() - start) * 1000)
        return {"status": "up", "response_time_ms": ms, "message": "Database connection is healthy"}
    except Exception as exc:
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
    # timeout=2.0 applies to the Celery broadcast wait, not the TCP handshake.
    # A hung broker TCP connection can exceed this timeout.
    try:
        inspect = celery_app.control.inspect(timeout=2.0)
        pong = inspect.ping()
        if pong:
            count = len(pong)
            return {"status": "up", "active_workers": count, "message": f"{count} Celery worker(s) available"}
        # Broker is reachable but no workers responded
        return {"status": "degraded", "active_workers": 0, "message": "Broker reachable but no workers responded"}
    except Exception as exc:
        logger.error("Celery worker check failed: %s", exc)
        return {"status": "down", "active_workers": 0, "message": "Celery worker check failed — broker may be unreachable"}


def check_celery_queues() -> dict:
    from django.conf import settings
    from .constants import CELERY_QUEUE_NAMES

    try:
        # CELERY_BROKER_URL (Redis DB 1) differs from the cache Redis (DB 0),
        # so we cannot reuse get_redis_connection("default") here.
        client = redis.from_url(
            settings.CELERY_BROKER_URL,
            socket_connect_timeout=2,
            socket_timeout=2,
            decode_responses=True,
        )
        client.ping()
        queues = {name: {"pending": client.llen(name)} for name in CELERY_QUEUE_NAMES}
        total_pending = sum(q["pending"] for q in queues.values())
        return {"status": "up", "queues": queues, "message": f"{total_pending} total pending task(s)"}
    except Exception as exc:
        logger.error("Celery queue check failed: %s", exc)
        return {"status": "down", "queues": {}, "message": "Celery broker unreachable"}


def check_celery_beat() -> dict:
    """
    Checks Celery Beat configuration and last heartbeat.
    Note: this verifies enabled task count and last run time via the DB,
    not whether the beat process is alive (no liveness probe available without external tooling).
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        from django_celery_beat.models import PeriodicTask

        enabled_count = PeriodicTask.objects.filter(enabled=True).count()
        # Check if any task has run in the last 2 hours (beat heartbeat proxy)
        recent_cutoff = timezone.now() - timedelta(hours=2)
        recently_ran = PeriodicTask.objects.filter(
            enabled=True,
            last_run_at__gte=recent_cutoff,
        ).exists()

        if recently_ran:
            return {
                "status": "up",
                "enabled_tasks": enabled_count,
                "message": f"{enabled_count} periodic task(s) enabled, beat running",
            }
        return {
            "status": "degraded",
            "enabled_tasks": enabled_count,
            "message": f"{enabled_count} periodic task(s) enabled but no recent runs detected (check beat process)",
        }
    except Exception as exc:
        logger.error("Celery beat check failed: %s", exc)
        return {"status": "down", "message": "Celery beat check failed"}


def check_storage() -> dict:
    from django.conf import settings

    if not getattr(settings, "USE_S3", False):
        return {"status": "up", "provider": "local", "message": "Local storage"}

    try:
        import boto3
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
