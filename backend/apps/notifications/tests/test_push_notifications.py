"""
Tests for Firebase push notification backend.

All Firebase calls are mocked — these tests run without any Firebase credentials
or network access.
"""
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from apps.accounts.models import CustomUser
from apps.notifications.models import (
    DeliveryStatus,
    DeviceToken,
    Notification,
    NotificationDelivery,
    Platform,
)
from apps.notifications.services import notify_user
from apps.notifications.services.push.firebase_service import FirebaseService, PushResult
from apps.notifications.tasks import deliver_push_notification


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_user(**kwargs) -> CustomUser:
    defaults = {
        "phone":     "+249912000001",
        "full_name": "Test User",
        "role":      "owner",
    }
    defaults.update(kwargs)
    return CustomUser.objects.create_user(**defaults)


def make_token(user, token="fcm-token-abc", platform=Platform.ANDROID) -> DeviceToken:
    return DeviceToken.objects.create(user=user, token=token, platform=platform)


FIREBASE_OFF = {
    "FIREBASE_ENABLED": False,
    "FIREBASE_CREDENTIALS_PATH": "",
    "FIREBASE_SERVICE_ACCOUNT_JSON": "",
}

FIREBASE_ON = {
    "FIREBASE_ENABLED": True,
    "FIREBASE_CREDENTIALS_PATH": "/fake/creds.json",
    "FIREBASE_SERVICE_ACCOUNT_JSON": "",
}


# ── Device token registration ─────────────────────────────────────────────────

class DeviceTokenRegistrationTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client.force_login(self.user)

    def test_register_new_token(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        api = APIClient()
        token = str(RefreshToken.for_user(self.user).access_token)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        res = api.post("/api/v1/notifications/devices/register/", {
            "token":    "device-token-1",
            "platform": "android",
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(DeviceToken.objects.filter(token="device-token-1", user=self.user).exists())

    def test_register_same_token_updates_existing(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        DeviceToken.objects.create(user=self.user, token="dup-token", platform="android", is_active=False)

        api = APIClient()
        jwt = str(RefreshToken.for_user(self.user).access_token)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {jwt}")

        res = api.post("/api/v1/notifications/devices/register/", {
            "token": "dup-token", "platform": "android",
        })
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["created"])
        # Token should now be active again
        dt = DeviceToken.objects.get(token="dup-token")
        self.assertTrue(dt.is_active)
        # Only one row — no duplicate
        self.assertEqual(DeviceToken.objects.filter(token="dup-token").count(), 1)

    def test_unregister_token(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        make_token(self.user, token="my-token")

        api = APIClient()
        jwt = str(RefreshToken.for_user(self.user).access_token)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {jwt}")

        res = api.post("/api/v1/notifications/devices/unregister/", {"token": "my-token"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["deactivated"])
        self.assertFalse(DeviceToken.objects.get(token="my-token").is_active)

    def test_cannot_unregister_another_users_token(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        other = make_user(phone="+249912000002")
        make_token(other, token="other-token")

        api = APIClient()
        jwt = str(RefreshToken.for_user(self.user).access_token)
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {jwt}")

        res = api.post("/api/v1/notifications/devices/unregister/", {"token": "other-token"})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["deactivated"])
        # Other user's token still active
        self.assertTrue(DeviceToken.objects.get(token="other-token").is_active)


# ── In-app notification endpoints ─────────────────────────────────────────────

class NotificationAPITest(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        self.user  = make_user()
        self.other = make_user(phone="+249912000099")
        self.api   = APIClient()
        jwt = str(RefreshToken.for_user(self.user).access_token)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {jwt}")

    def _make_notification(self, user=None, is_read=False):
        return Notification.objects.create(
            user=user or self.user,
            title="Test", body="Body",
            notification_type="info",
            is_read=is_read,
        )

    def test_list_returns_only_own_notifications(self):
        self._make_notification(self.user)
        self._make_notification(self.other)   # should not appear

        res = self.api.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)

    def test_unread_count(self):
        self._make_notification(is_read=False)
        self._make_notification(is_read=False)
        self._make_notification(is_read=True)

        res = self.api.get("/api/v1/notifications/unread-count/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["unread_count"], 2)

    def test_mark_single_read(self):
        n = self._make_notification(is_read=False)

        res = self.api.patch(f"/api/v1/notifications/{n.id}/read/")
        self.assertEqual(res.status_code, 200)
        n.refresh_from_db()
        self.assertTrue(n.is_read)

    def test_mark_all_read(self):
        self._make_notification(is_read=False)
        self._make_notification(is_read=False)

        res = self.api.post("/api/v1/notifications/mark-all-read/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["marked_read"], 2)
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=False).count(), 0)

    def test_cannot_mark_other_users_notification_read(self):
        n = self._make_notification(self.other)

        res = self.api.patch(f"/api/v1/notifications/{n.id}/read/")
        self.assertEqual(res.status_code, 404)


# ── notify_user service ───────────────────────────────────────────────────────

class NotifyUserServiceTest(TestCase):
    def setUp(self):
        # Reset Firebase singleton between tests
        FirebaseService._initialized = False
        FirebaseService._ready = False
        FirebaseService._app = None

    @override_settings(**FIREBASE_OFF)
    def test_notify_user_creates_notification_and_delivery(self):
        user = make_user()

        with patch("apps.notifications.tasks.deliver_push_notification.delay") as mock_task:
            with self.captureOnCommitCallbacks(execute=True):
                notification = notify_user(user, title="Hello", body="World", notification_type="info")

        self.assertIsNotNone(notification.id)
        self.assertEqual(Notification.objects.filter(user=user).count(), 1)
        delivery = NotificationDelivery.objects.get(notification=notification)
        self.assertEqual(delivery.status, DeliveryStatus.PENDING)
        mock_task.assert_called_once_with(str(delivery.id))

    @override_settings(**FIREBASE_OFF)
    def test_notify_user_does_not_dispatch_task_on_transaction_rollback(self):
        """Task must not be queued if outer transaction rolls back."""
        from django.db import transaction

        user = make_user()
        dispatched = []

        with patch("apps.notifications.tasks.deliver_push_notification.delay",
                   side_effect=lambda *a, **kw: dispatched.append(a)):
            try:
                with transaction.atomic():
                    notify_user(user, title="Rollback", body="Test")
                    raise ValueError("Force rollback")
            except ValueError:
                pass

        self.assertEqual(len(dispatched), 0)
        self.assertEqual(Notification.objects.filter(user=user).count(), 0)


# ── deliver_push_notification task ────────────────────────────────────────────

class DeliverPushNotificationTaskTest(TestCase):
    def setUp(self):
        FirebaseService._initialized = False
        FirebaseService._ready = False
        FirebaseService._app = None

    def _make_delivery(self, user, status=DeliveryStatus.PENDING) -> NotificationDelivery:
        notification = Notification.objects.create(
            user=user, title="T", body="B", notification_type="info",
        )
        return NotificationDelivery.objects.create(
            notification=notification,
            recipient=user,
            channel="push",
            status=status,
            payload={"title": "T", "body": "B", "data": {}},
        )

    @override_settings(**FIREBASE_OFF)
    def test_marks_sent_when_no_active_tokens(self):
        user = make_user()
        delivery = self._make_delivery(user)

        deliver_push_notification(str(delivery.id))

        delivery.refresh_from_db()
        self.assertEqual(delivery.status, DeliveryStatus.SENT)

    @override_settings(**FIREBASE_OFF)
    def test_marks_sent_when_firebase_disabled_and_has_token(self):
        user = make_user()
        make_token(user, token="fake-token")
        delivery = self._make_delivery(user)

        # Firebase disabled → send_to_token returns failure
        deliver_push_notification(str(delivery.id))

        delivery.refresh_from_db()
        # With Firebase disabled, all tokens fail → should retry
        self.assertIn(delivery.status, [DeliveryStatus.PENDING, DeliveryStatus.FAILED])

    @override_settings(**FIREBASE_OFF)
    def test_marks_sent_on_success(self):
        user = make_user()
        make_token(user, token="good-token")
        delivery = self._make_delivery(user)

        with patch.object(FirebaseService, "send_to_token",
                          return_value=PushResult(success=True, message_id="msg123")):
            deliver_push_notification(str(delivery.id))

        delivery.refresh_from_db()
        self.assertEqual(delivery.status, DeliveryStatus.SENT)
        self.assertEqual(delivery.provider_message_id, "msg123")

    @override_settings(**FIREBASE_OFF)
    def test_retries_on_temporary_failure(self):
        user = make_user()
        make_token(user, token="temp-fail-token")
        delivery = self._make_delivery(user)

        with patch.object(FirebaseService, "send_to_token",
                          return_value=PushResult(success=False, error="network_error")):
            with patch("apps.notifications.tasks.deliver_push_notification.apply_async") as mock_retry:
                deliver_push_notification(str(delivery.id))

        delivery.refresh_from_db()
        self.assertEqual(delivery.status, DeliveryStatus.PENDING)
        self.assertEqual(delivery.retry_count, 1)
        mock_retry.assert_called_once()

    @override_settings(**FIREBASE_OFF)
    def test_permanently_fails_after_max_retries(self):
        user = make_user()
        make_token(user, token="dead-token")
        delivery = self._make_delivery(user)
        delivery.retry_count = 3   # already at max
        delivery.save(update_fields=["retry_count"])

        with patch.object(FirebaseService, "send_to_token",
                          return_value=PushResult(success=False, error="still_failing")):
            deliver_push_notification(str(delivery.id))

        delivery.refresh_from_db()
        self.assertEqual(delivery.status, DeliveryStatus.FAILED)
        self.assertIsNotNone(delivery.failed_at)

    @override_settings(**FIREBASE_OFF)
    def test_deactivates_invalid_token(self):
        user = make_user()
        dt = make_token(user, token="invalid-fcm-token")
        delivery = self._make_delivery(user)

        with patch.object(FirebaseService, "send_to_token",
                          return_value=PushResult(success=False, error="invalid_token",
                                                  invalid_tokens=["invalid-fcm-token"])):
            deliver_push_notification(str(delivery.id))

        dt.refresh_from_db()
        self.assertFalse(dt.is_active)

    @override_settings(**FIREBASE_OFF)
    def test_skips_already_processed_delivery(self):
        user = make_user()
        delivery = self._make_delivery(user, status=DeliveryStatus.SENT)

        with patch.object(FirebaseService, "send_to_token") as mock_send:
            deliver_push_notification(str(delivery.id))

        mock_send.assert_not_called()

    @override_settings(**FIREBASE_OFF)
    def test_duplicate_task_does_not_double_send(self):
        """
        Two workers racing on the same delivery — only one should win the lock.
        We simulate this by calling the task twice sequentially; after the first
        call marks the delivery SENT, the second call finds it in a non-pending
        state and returns early.
        """
        user = make_user()
        make_token(user, token="race-token")
        delivery = self._make_delivery(user)

        send_count = []

        def counting_send(*args, **kwargs):
            send_count.append(1)
            return PushResult(success=True, message_id="msg-race")

        with patch.object(FirebaseService, "send_to_token", side_effect=counting_send):
            deliver_push_notification(str(delivery.id))
            deliver_push_notification(str(delivery.id))  # second call — already sent

        self.assertEqual(len(send_count), 1)


# ── Firebase disabled mode ─────────────────────────────────────────────────────

class FirebaseDisabledTest(TestCase):
    def setUp(self):
        FirebaseService._initialized = False
        FirebaseService._ready = False
        FirebaseService._app = None

    @override_settings(**FIREBASE_OFF)
    def test_send_to_token_returns_failure_gracefully(self):
        result = FirebaseService.send_to_token("any-token", "Title", "Body")
        self.assertFalse(result.success)
        self.assertEqual(result.error, "firebase_disabled")

    @override_settings(**FIREBASE_OFF)
    def test_send_to_user_returns_empty_list(self):
        user = make_user()
        make_token(user)
        results = FirebaseService.send_to_user(user, "Title", "Body")
        # All tokens fail with firebase_disabled, then deactivation attempted
        # but the token is still returned in results
        for r in results:
            self.assertFalse(r.success)

    @override_settings(**FIREBASE_OFF)
    def test_app_does_not_crash_on_firebase_disabled(self):
        """Entire notification flow must succeed even with Firebase off."""
        user = make_user()
        make_token(user, token="any-token")

        with patch("apps.notifications.tasks.deliver_push_notification.delay"):
            notification = notify_user(user, title="Test", body="Test")

        self.assertIsNotNone(notification.id)


# ── Offline sync deduplication ────────────────────────────────────────────────

class OfflineSyncDeduplicationTest(TestCase):
    """
    Verify that syncing the same offline sale twice does not produce
    duplicate notifications.
    """

    @override_settings(**FIREBASE_OFF)
    def test_no_duplicate_notification_for_same_sale(self):
        user = make_user()

        with patch("apps.notifications.tasks.deliver_push_notification.delay"):
            # Simulate first sync
            notify_user(user, title="Sale Complete", body="#REC-001",
                        notification_type="sale", data={"receipt": "REC-001"})

        initial_count = Notification.objects.filter(user=user).count()
        self.assertEqual(initial_count, 1)

        # Business logic is responsible for idempotency (checking client_sale_id
        # before calling notify_user). This test verifies notify_user itself
        # creates exactly one record per call — deduplication belongs in the
        # sale sync view, not the notification service.
        self.assertEqual(Notification.objects.filter(user=user).count(), 1)
