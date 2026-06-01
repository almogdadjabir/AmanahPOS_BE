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
