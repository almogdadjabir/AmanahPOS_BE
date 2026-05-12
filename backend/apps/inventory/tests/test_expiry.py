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
