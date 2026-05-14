"""Tests for GET /api/v1/sales/dashboard-summary/"""
import zoneinfo
from datetime import datetime, timedelta, time as dt_time
from decimal import Decimal

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.products.models import Product
from apps.sales.models import PaymentMethod, Sale, SaleItem, SaleStatus
from apps.tenants.models import Business, Shop

ENDPOINT = "/api/v1/sales/dashboard-summary/"

CACHE_SETTINGS = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-dashboard-cache",
    }
}


def _today_utc_range(tz_name="Africa/Khartoum"):
    """Return (start_utc, end_utc) for today in the given IANA timezone."""
    tz = zoneinfo.ZoneInfo(tz_name)
    today = datetime.now(tz).date()
    local_start = datetime.combine(today, dt_time.min).replace(tzinfo=tz)
    start_utc = local_start.astimezone(zoneinfo.ZoneInfo("UTC"))
    return start_utc, start_utc + timedelta(days=1)


@override_settings(CACHES=CACHE_SETTINGS)
class DashboardSummaryTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self._receipt_counter = 0

        self.owner = CustomUser.objects.create(
            phone="+249900000001",
            full_name="Owner User",
            role="owner",
            is_active=True,
        )

        self.business = Business.objects.create(
            name="Test Business",
            owner=self.owner,
            currency="SDG",
            timezone="Africa/Khartoum",
        )
        self.owner.business = self.business
        self.owner.save(update_fields=["business"])

        self.shop = Shop.objects.create(
            business=self.business,
            name="Main Shop",
            is_main=True,
            is_active=True,
        )
        self.shop2 = Shop.objects.create(
            business=self.business,
            name="Branch Shop",
            is_main=False,
            is_active=True,
        )

        self.cashier = CustomUser.objects.create(
            phone="+249900000002",
            full_name="Cashier User",
            role="cashier",
            business=self.business,
            default_shop=self.shop,
            is_active=True,
        )

        self.product = Product.objects.create(
            tenant=self.business,
            name="Test Product",
            price=Decimal("500.00"),
        )

    def _make_sale(
        self,
        shop=None,
        cashier=None,
        amount=Decimal("1000.00"),
        payment=PaymentMethod.CASH,
        status=SaleStatus.COMPLETED,
        created_at_utc=None,
        add_item=False,
    ) -> Sale:
        shop = shop or self.shop
        cashier = cashier or self.cashier
        self._receipt_counter += 1
        sale = Sale.objects.create(
            tenant=self.business,
            shop=shop,
            cashier=cashier,
            receipt_number=f"TEST-{self._receipt_counter:06d}",
            total_amount=amount,
            discount_amount=Decimal("0"),
            tax_amount=Decimal("0"),
            net_amount=amount,
            payment_method=payment,
            status=status,
        )
        if created_at_utc:
            Sale.objects.filter(pk=sale.pk).update(created_at=created_at_utc)
            sale.refresh_from_db()
        if add_item:
            SaleItem.objects.create(
                sale=sale,
                product=self.product,
                quantity=Decimal("2"),
                unit_price=Decimal("500.00"),
                discount=Decimal("0"),
                subtotal=Decimal("1000.00"),
            )
        return sale

    def test_owner_no_shop_id_aggregates_all_shops(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        self._make_sale(shop=self.shop, amount=Decimal("1000.00"), created_at_utc=mid)
        self._make_sale(shop=self.shop2, amount=Decimal("2000.00"), created_at_utc=mid)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["success"])
        self.assertEqual(res.data["today"]["sales_count"], 2)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 3000.0, places=2)
        self.assertIsNone(res.data["scope"]["shop_id"])

    def test_owner_with_shop_id_scopes_to_shop(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        self._make_sale(shop=self.shop, amount=Decimal("1000.00"), created_at_utc=mid)
        self._make_sale(shop=self.shop2, amount=Decimal("2000.00"), created_at_utc=mid)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"shop_id": str(self.shop.id)})

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["today"]["sales_count"], 1)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 1000.0, places=2)
        self.assertEqual(res.data["scope"]["shop_id"], str(self.shop.id))
        self.assertEqual(res.data["scope"]["shop_name"], "Main Shop")

    def test_cashier_forced_to_default_shop_shift_populated(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        self._make_sale(shop=self.shop, cashier=self.cashier,
                        amount=Decimal("500.00"), created_at_utc=mid)
        self._make_sale(shop=self.shop2, cashier=self.cashier,
                        amount=Decimal("999.00"), created_at_utc=mid)

        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["today"]["sales_count"], 1)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 500.0, places=2)
        self.assertEqual(res.data["scope"]["shop_id"], str(self.shop.id))
        shift = res.data["shift"]
        self.assertEqual(shift["cashier_id"], str(self.cashier.id))
        self.assertIsNotNone(shift["shift_started_at"])
        self.assertEqual(shift["sales_count"], 1)

    def test_cashier_no_default_shop_returns_400(self):
        homeless = CustomUser.objects.create(
            phone="+249900000003",
            full_name="Homeless Cashier",
            role="cashier",
            business=self.business,
            is_active=True,
        )
        self.client.force_authenticate(user=homeless)
        res = self.client.get(ENDPOINT)
        self.assertEqual(res.status_code, 400)

    def test_utc_boundary_last_second_of_today_is_included(self):
        start, end = _today_utc_range()
        just_before = end - timedelta(seconds=61)
        just_after = end + timedelta(seconds=1)

        self._make_sale(amount=Decimal("100.00"), created_at_utc=just_before)
        self._make_sale(amount=Decimal("999.00"), created_at_utc=just_after)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.data["today"]["sales_count"], 1)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 100.0, places=2)

    def test_sparkline_includes_zero_filled_hours(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.status_code, 200)
        points = res.data["sparkline"]["points"]
        self.assertGreater(len(points), 0)
        self.assertEqual(res.data["sparkline"]["interval"], "hour")
        for p in points:
            self.assertIn("label", p)
            self.assertIn("amount", p)
            self.assertIn("sales_count", p)
        self.assertTrue(all(p["amount"] == 0.0 for p in points))

    def test_refunds_excluded_from_gross_counted_separately(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        self._make_sale(amount=Decimal("1000.00"),
                        status=SaleStatus.COMPLETED, created_at_utc=mid)
        self._make_sale(amount=Decimal("200.00"),
                        status=SaleStatus.REFUNDED, created_at_utc=mid)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        today = res.data["today"]
        self.assertAlmostEqual(today["gross_sales_amount"], 1000.0, places=2)
        self.assertAlmostEqual(today["refund_amount"], 200.0, places=2)
        self.assertEqual(today["refund_count"], 1)
        self.assertAlmostEqual(today["net_sales_amount"], 800.0, places=2)
        self.assertEqual(today["sales_count"], 1)

    def test_cancelled_and_pending_sales_excluded(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        self._make_sale(amount=Decimal("1000.00"),
                        status=SaleStatus.COMPLETED, created_at_utc=mid)
        self._make_sale(amount=Decimal("500.00"),
                        status=SaleStatus.CANCELLED, created_at_utc=mid)
        self._make_sale(amount=Decimal("300.00"),
                        status=SaleStatus.PENDING, created_at_utc=mid)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.data["today"]["sales_count"], 1)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 1000.0, places=2)

    def test_top_sellers_limit_clamped_to_20(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"top_sellers_limit": "999"})
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.data["top_sellers"], list)

    def test_all_amounts_are_zero_float_when_no_sales(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        today = res.data["today"]
        self.assertEqual(today["gross_sales_amount"], 0.0)
        self.assertEqual(today["net_sales_amount"], 0.0)
        self.assertEqual(today["sales_count"], 0)
        self.assertEqual(today["average_sale_amount"], 0.0)
        self.assertEqual(today["refund_amount"], 0.0)
        self.assertEqual(today["refund_count"], 0)
        self.assertEqual(today["cash_amount"], 0.0)
        self.assertEqual(today["bankak_amount"], 0.0)

    def test_cache_hit_returns_same_last_calculated_at(self):
        self.client.force_authenticate(user=self.owner)
        res1 = self.client.get(ENDPOINT)
        res2 = self.client.get(ENDPOINT)
        self.assertEqual(
            res1.data["sync"]["last_calculated_at"],
            res2.data["sync"]["last_calculated_at"],
        )

    def test_invalid_date_format_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"date": "14-05-2026"})
        self.assertEqual(res.status_code, 400)

    def test_future_date_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"date": "2099-01-01"})
        self.assertEqual(res.status_code, 400)

    def test_shop_id_from_other_business_returns_404(self):
        other_owner = CustomUser.objects.create(
            phone="+249900000099",
            full_name="Other Owner",
            role="owner",
            is_active=True,
        )
        other_biz = Business.objects.create(
            name="Other Business",
            owner=other_owner,
        )
        foreign_shop = Shop.objects.create(
            business=other_biz,
            name="Foreign Shop",
            is_main=True,
            is_active=True,
        )

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"shop_id": str(foreign_shop.id)})
        self.assertEqual(res.status_code, 404)
