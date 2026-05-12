import uuid
from datetime import date, timedelta

from django.test import TestCase

from apps.accounts.models import CustomUser
from apps.tenants.models import Business, BusinessType, Shop
from apps.products.models import Product


def make_owner(phone="+249912111001"):
    return CustomUser.objects.create_user(phone=phone, full_name="Owner", role="owner")


def make_shop_business(owner, name="Shop Biz"):
    return Business.objects.create(name=name, owner=owner, business_type=BusinessType.SHOP)


def make_restaurant(owner, name="Restaurant Biz"):
    return Business.objects.create(name=name, owner=owner, business_type=BusinessType.RESTAURANT)


def make_shop(business, name="Main Shop"):
    return Shop.objects.create(name=name, business=business)


def make_product(tenant, name="Milk"):
    return Product.objects.create(
        tenant=tenant, name=name, price="1.00", track_inventory=True
    )


class ProductBatchModelTest(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.business = make_shop_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)

    def test_create_batch(self):
        from apps.inventory.models import ProductBatch
        batch = ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=50,
            expiry_date=date.today() + timedelta(days=10),
        )
        self.assertEqual(batch.product, self.product)
        self.assertIsNone(batch.last_notified_date)

    def test_batch_is_expired(self):
        from apps.inventory.models import ProductBatch
        batch = ProductBatch(expiry_date=date.today() - timedelta(days=1))
        self.assertTrue(batch.is_expired)

    def test_batch_is_expiring_soon_within_7_days(self):
        from apps.inventory.models import ProductBatch
        batch = ProductBatch(expiry_date=date.today() + timedelta(days=5))
        self.assertTrue(batch.is_expiring_soon(warning_days=7))

    def test_batch_not_expiring_soon_beyond_window(self):
        from apps.inventory.models import ProductBatch
        batch = ProductBatch(expiry_date=date.today() + timedelta(days=30))
        self.assertFalse(batch.is_expiring_soon(warning_days=7))


class ExpiryTemplatesTest(TestCase):
    def test_product_expiring_soon_template(self):
        from apps.notifications.notification_templates import render_notification
        payload = render_notification(
            "product_expiring_soon",
            product_name="Milk 1L",
            shop_name="Main Branch",
            expiry_date="2026-05-20",
        )
        self.assertIn("Milk 1L", payload["body"])
        self.assertEqual(payload["notification_type"], "warning")

    def test_product_expired_template(self):
        from apps.notifications.notification_templates import render_notification
        payload = render_notification(
            "product_expired",
            product_name="Yogurt",
            shop_name="Branch 2",
            expiry_date="2026-05-10",
        )
        self.assertIn("Yogurt", payload["body"])
        self.assertEqual(payload["notification_type"], "error")

    def test_expiry_settings_defaults(self):
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()
        self.assertEqual(NotificationSetting.get("expiry_alert_enabled"), "true")
        self.assertEqual(NotificationSetting.get("expiry_warning_days"), "7")
        self.assertEqual(NotificationSetting.get("expired_alert_enabled"), "true")


from unittest.mock import patch


class ExpiryAlertTaskTest(TestCase):
    def setUp(self):
        self.owner = make_owner("+249912111002")
        self.shop_biz = make_shop_business(self.owner, "Shop Biz")
        self.restaurant = make_restaurant(self.owner, "Restaurant")
        self.shop = make_shop(self.shop_biz)
        self.rest_shop = make_shop(self.restaurant, "Rest Shop")
        self.product = make_product(self.shop_biz)
        self.rest_product = make_product(self.restaurant, "Burger")

    @patch("apps.notifications.services.notify_user")
    def test_expiring_soon_sends_warning_notification(self, mock_notify):
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()

        batch = ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=10,
            expiry_date=date.today() + timedelta(days=3),
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()

        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args
        self.assertEqual(call_kwargs[1]["notification_type"], "warning")
        batch.refresh_from_db()
        from django.utils import timezone
        self.assertEqual(batch.last_notified_date, timezone.now().date())

    @patch("apps.notifications.services.notify_user")
    def test_expired_sends_error_notification(self, mock_notify):
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()

        ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=10,
            expiry_date=date.today() - timedelta(days=2),
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()

        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args
        self.assertEqual(call_kwargs[1]["notification_type"], "error")

    @patch("apps.notifications.services.notify_user")
    def test_no_duplicate_notification_same_day(self, mock_notify):
        from django.utils import timezone
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()

        ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=10,
            expiry_date=date.today() + timedelta(days=3),
            last_notified_date=timezone.now().date(),
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()
        mock_notify.assert_not_called()

    @patch("apps.notifications.services.notify_user")
    def test_restaurant_business_skipped(self, mock_notify):
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()

        ProductBatch.objects.create(
            product=self.rest_product,
            shop=self.rest_shop,
            quantity=5,
            expiry_date=date.today() + timedelta(days=2),
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()
        mock_notify.assert_not_called()

    @patch("apps.notifications.services.notify_user")
    def test_disabled_setting_prevents_notification(self, mock_notify):
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()
        NotificationSetting.objects.filter(key="expiry_alert_enabled").update(value="false")
        NotificationSetting.objects.filter(key="expired_alert_enabled").update(value="false")

        ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=10,
            expiry_date=date.today() + timedelta(days=2),
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()
        mock_notify.assert_not_called()
