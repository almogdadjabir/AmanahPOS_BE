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


class ProductBatchSerializerTest(TestCase):
    def setUp(self):
        self.owner = make_owner("+249912111003")
        self.business = make_shop_business(self.owner, "Biz Ser")
        self.shop = make_shop(self.business, "Ser Shop")
        self.product = make_product(self.business, "Cheese")

    def test_write_serializer_valid(self):
        from apps.inventory.serializers import ProductBatchWriteSerializer
        data = {
            "product": str(self.product.id),
            "shop": str(self.shop.id),
            "quantity": "25.000",
            "expiry_date": str(date.today() + timedelta(days=20)),
            "batch_number": "BATCH-001",
        }
        s = ProductBatchWriteSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)

    def test_write_serializer_rejects_past_expiry(self):
        from apps.inventory.serializers import ProductBatchWriteSerializer
        data = {
            "product": str(self.product.id),
            "shop": str(self.shop.id),
            "quantity": "10.000",
            "expiry_date": str(date.today() - timedelta(days=1)),
        }
        s = ProductBatchWriteSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("expiry_date", s.errors)

    def test_read_serializer_includes_is_expired(self):
        from apps.inventory.models import ProductBatch
        from apps.inventory.serializers import ProductBatchSerializer
        batch = ProductBatch.objects.create(
            product=self.product, shop=self.shop, quantity=5,
            expiry_date=date.today() - timedelta(days=1),
        )
        data = ProductBatchSerializer(batch).data
        self.assertTrue(data["is_expired"])


from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def api_client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(user).access_token)}")
    return c


class BatchAPITest(TestCase):
    def setUp(self):
        self.owner = make_owner("+249912111004")
        self.business = make_shop_business(self.owner, "API Biz")
        self.shop = make_shop(self.business, "API Shop")
        self.product = make_product(self.business, "Oil")
        self.client = api_client(self.owner)

    def _auth_headers(self):
        return {"HTTP_X_TENANT_ID": str(self.business.id)}

    def test_create_batch(self):
        res = self.client.post(
            "/api/v1/inventory/batches/",
            {
                "product": str(self.product.id),
                "shop": str(self.shop.id),
                "quantity": "20.000",
                "expiry_date": str(date.today() + timedelta(days=30)),
                "batch_number": "B001",
            },
            format="json",
            **self._auth_headers(),
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["data"]["batch_number"], "B001")

    def test_list_batches(self):
        from apps.inventory.models import ProductBatch
        ProductBatch.objects.create(
            product=self.product, shop=self.shop, quantity=5,
            expiry_date=date.today() + timedelta(days=5),
        )
        res = self.client.get("/api/v1/inventory/batches/", **self._auth_headers())
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["count"], 1)

    def test_expiry_alerts_returns_expiring_and_expired(self):
        from apps.inventory.models import ProductBatch
        ProductBatch.objects.create(
            product=self.product, shop=self.shop, quantity=5,
            expiry_date=date.today() + timedelta(days=3),
        )
        ProductBatch.objects.create(
            product=self.product, shop=self.shop, quantity=2,
            expiry_date=date.today() - timedelta(days=1),
        )
        res = self.client.get("/api/v1/inventory/expiry-alerts/", **self._auth_headers())
        self.assertEqual(res.status_code, 200)
        self.assertIn("expiring_soon", res.data["data"])
        self.assertIn("expired", res.data["data"])
        self.assertEqual(len(res.data["data"]["expiring_soon"]), 1)
        self.assertEqual(len(res.data["data"]["expired"]), 1)

    def test_restaurant_cannot_create_batch(self):
        rest_owner = make_owner("+249912111009")
        rest_biz = make_restaurant(rest_owner, "Rest Biz")
        rest_shop = make_shop(rest_biz, "Rest Shop")
        rest_product = make_product(rest_biz, "Pasta")
        c = api_client(rest_owner)
        res = c.post(
            "/api/v1/inventory/batches/",
            {
                "product": str(rest_product.id),
                "shop": str(rest_shop.id),
                "quantity": "10.000",
                "expiry_date": str(date.today() + timedelta(days=10)),
            },
            format="json",
            **{"HTTP_X_TENANT_ID": str(rest_biz.id)},
        )
        self.assertEqual(res.status_code, 403, res.data)

    def test_tenant_isolation_other_business_batch_invisible(self):
        from apps.inventory.models import ProductBatch
        other_owner = make_owner("+249912111005")
        other_biz   = make_shop_business(other_owner, "Other Biz")
        other_shop  = make_shop(other_biz, "Other Shop")
        other_prod  = make_product(other_biz, "Widget")
        ProductBatch.objects.create(
            product=other_prod, shop=other_shop, quantity=5,
            expiry_date=date.today() + timedelta(days=5),
        )
        res = self.client.get("/api/v1/inventory/batches/", **self._auth_headers())
        self.assertEqual(res.status_code, 200)
        for item in res.data["results"]:
            self.assertNotEqual(item["shop"], str(other_shop.id))
