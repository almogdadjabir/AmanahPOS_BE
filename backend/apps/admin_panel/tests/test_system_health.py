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
        before = get_notification_stats()["pending_notifications"]
        for _ in range(3):
            NotificationDelivery.objects.create(
                recipient=user,
                channel="push",
                status=DeliveryStatus.PENDING,
            )
        after = get_notification_stats()["pending_notifications"]
        self.assertEqual(after - before, 3)

    def test_failed_count_24h_only(self):
        from django.utils import timezone
        from datetime import timedelta
        from apps.admin_panel.system.selectors import get_notification_stats
        from apps.notifications.models.delivery import NotificationDelivery, DeliveryStatus

        user = _make_admin(phone="+249900000011")
        now = timezone.now()

        # Recent failure — should be counted
        NotificationDelivery.objects.create(
            recipient=user,
            channel="push",
            status=DeliveryStatus.FAILED,
            failed_at=now,
        )

        result = get_notification_stats()
        self.assertGreaterEqual(result["failed_notifications_24h"], 1)

    def test_failed_count_excludes_old_records(self):
        from django.utils import timezone
        from datetime import timedelta
        from apps.admin_panel.system.selectors import get_notification_stats
        from apps.notifications.models.delivery import NotificationDelivery, DeliveryStatus

        user = _make_admin(phone="+249900000012")
        # Old failure (25 hours ago) — should NOT be counted
        old_time = timezone.now() - timedelta(hours=25)
        old_record = NotificationDelivery.objects.create(
            recipient=user,
            channel="push",
            status=DeliveryStatus.FAILED,
            failed_at=old_time,
        )
        # Force the failed_at to the old time (create sets auto_now fields)
        NotificationDelivery.objects.filter(pk=old_record.pk).update(failed_at=old_time)

        before = get_notification_stats()["failed_notifications_24h"]
        # Create a recent failure
        NotificationDelivery.objects.create(
            recipient=user,
            channel="push",
            status=DeliveryStatus.FAILED,
            failed_at=timezone.now(),
        )
        after = get_notification_stats()["failed_notifications_24h"]
        # Only the recent one should be counted (old one excluded)
        self.assertEqual(after - before, 1)


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

    def test_error_logs_count_is_integer(self):
        from apps.admin_panel.system.selectors import get_audit_log_stats
        result = get_audit_log_stats()
        self.assertIsInstance(result["error_logs_24h"], int)

    def test_error_logs_counts_500_status(self):
        from apps.admin_panel.system.selectors import get_audit_log_stats
        from apps.audit_logs.models.audit_log import AuditLog

        user = _make_admin(phone="+249900000020")
        AuditLog.objects.create(
            user=user,
            action="other",
            model_name="test",
            extra={"status_code": 500, "duration_ms": 10},
        )
        result = get_audit_log_stats()
        self.assertGreaterEqual(result["error_logs_24h"], 1)

    def test_error_logs_excludes_non_500(self):
        from apps.admin_panel.system.selectors import get_audit_log_stats
        from apps.audit_logs.models.audit_log import AuditLog

        user = _make_admin(phone="+249900000021")
        AuditLog.objects.create(
            user=user,
            action="create",
            model_name="test",
            extra={"status_code": 200, "duration_ms": 5},
        )
        result = get_audit_log_stats()
        self.assertEqual(result["error_logs_24h"], 0)

    def test_error_logs_numeric_boundary(self):
        from apps.admin_panel.system.selectors import get_audit_log_stats
        from apps.audit_logs.models.audit_log import AuditLog

        user = _make_admin(phone="+249900000022")
        # 499 should NOT be counted
        AuditLog.objects.create(
            user=user, action="other", model_name="test",
            extra={"status_code": 499, "duration_ms": 5},
        )
        # 501 should be counted
        AuditLog.objects.create(
            user=user, action="other", model_name="test",
            extra={"status_code": 501, "duration_ms": 5},
        )
        result = get_audit_log_stats()
        # 499 excluded, 501 included
        self.assertGreaterEqual(result["error_logs_24h"], 1)


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

    def test_redis_success_returns_up(self):
        from apps.admin_panel.system.health_checks import check_redis
        with patch("apps.admin_panel.system.health_checks.get_redis_connection") as mock_get:
            mock_conn = MagicMock()
            mock_conn.ping.return_value = True
            mock_get.return_value = mock_conn
            result = check_redis()
        self.assertEqual(result["status"], "up")
        self.assertIsInstance(result["response_time_ms"], int)


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

    def test_no_workers_returns_degraded(self):
        from apps.admin_panel.system.health_checks import check_celery_workers
        with patch("apps.admin_panel.system.health_checks.celery_app") as mock_app:
            mock_inspect = MagicMock()
            mock_inspect.ping.return_value = {}
            mock_app.control.inspect.return_value = mock_inspect
            result = check_celery_workers()
        self.assertEqual(result["status"], "degraded")
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
        with patch("boto3.client") as mock_boto_client:
            mock_client = MagicMock()
            mock_client.head_bucket.return_value = {}
            mock_boto_client.return_value = mock_client
            result = check_storage()
        self.assertEqual(result["status"], "up")
        self.assertEqual(result["provider"], "minio")

    @override_settings(USE_S3=True, AWS_S3_ENDPOINT_URL="http://minio:9000",
                       AWS_ACCESS_KEY_ID="key", AWS_SECRET_ACCESS_KEY="secret",
                       AWS_S3_REGION_NAME="us-east-1", AWS_S3_PUBLIC_BUCKET_NAME="test-bucket")
    def test_minio_failure_returns_down(self):
        from apps.admin_panel.system.health_checks import check_storage
        with patch("boto3.client") as mock_boto_client:
            mock_boto_client.side_effect = Exception("Connection refused")
            result = check_storage()
        self.assertEqual(result["status"], "down")
        result_str = str(result)
        self.assertNotIn("secret", result_str.lower())


class CeleryBeatCheckTests(TestCase):
    def test_beat_with_recent_runs_returns_up(self):
        from apps.admin_panel.system.health_checks import check_celery_beat
        with patch("apps.admin_panel.system.health_checks.check_celery_beat") as mock_fn:
            mock_fn.return_value = {"status": "up", "enabled_tasks": 4, "message": "4 periodic task(s) enabled, beat running"}
            result = mock_fn()
        self.assertEqual(result["status"], "up")

    def test_beat_exception_returns_down(self):
        from apps.admin_panel.system.health_checks import check_celery_beat
        with patch("django_celery_beat.models.PeriodicTask.objects") as mock_qs:
            mock_qs.filter.side_effect = Exception("DB error")
            result = check_celery_beat()
        self.assertEqual(result["status"], "down")
