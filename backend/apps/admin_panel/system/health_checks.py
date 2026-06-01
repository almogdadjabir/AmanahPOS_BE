import logging
import time

import boto3
import redis
from django.db import connections
from django_redis import get_redis_connection

from config.celery import app as celery_app

logger = logging.getLogger(__name__)


def check_database() -> dict:
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
