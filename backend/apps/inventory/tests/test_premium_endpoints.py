"""
Tests for premium-gated inventory endpoints:
  GET /api/v1/inventory/premium-summary/
  GET /api/v1/inventory/inbound/<pk>/
  GET /api/v1/inventory/reports/expiry/
"""
from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import CustomUser
from apps.inventory.models import (
    InboundTransaction,
    InboundTransactionItem,
    ProductBatch,
    StockLevel,
    Vendor,
)
from apps.products.models import Product
from apps.subscriptions.models import Plan
from apps.tenants.models import Business, BusinessType, Shop


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_plan(name="Biz", with_feature=True):
    return Plan.objects.create(
        name=name, price="0", currency="SDG", is_free=True,
        features={"inventory_inbound_receiving": True} if with_feature else {},
    )


def make_owner(phone="+249920000001"):
    return CustomUser.objects.create_user(phone=phone, full_name="Owner", role="owner")


def make_business(owner, plan, name="Test Biz"):
    b = Business.objects.create(
        name=name, owner=owner,
        business_type=BusinessType.SHOP,
        subscription_plan=plan,
    )
    owner.business = b
    owner.save(update_fields=["business", "updated_at"])
    return b


def make_shop(business, name="Main Shop"):
    return Shop.objects.create(name=name, business=business)


def make_product(tenant, name="Milk", min_stock=5):
    return Product.objects.create(
        tenant=tenant, name=name, price="1.00",
        track_inventory=True, min_stock_level=min_stock,
    )


def make_vendor(tenant, name="Al Noor"):
    return Vendor.objects.create(tenant=tenant, name=name, is_active=True)


def auth_client(user):
    c = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return c


SUMMARY_URL      = "/api/v1/inventory/premium-summary/"
EXPIRY_URL       = "/api/v1/inventory/reports/expiry/"

def inbound_detail_url(pk):
    return f"/api/v1/inventory/inbound/{pk}/"


# ── PremiumSummaryView ────────────────────────────────────────────────────────

class PremiumSummaryViewTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, self.plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz, min_stock=5)
        self.client  = auth_client(self.owner)

    def test_requires_feature(self):
        no_feat_plan = make_plan(name="Free", with_feature=False)
        self.biz.subscription_plan = no_feat_plan
        self.biz.save(update_fields=["subscription_plan"])
        res = self.client.get(SUMMARY_URL)
        self.assertIn(res.status_code, [400, 422])

    def test_returns_all_expected_fields(self):
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        data = res.data["data"]
        for field in [
            "stock_items_count", "low_stock_count", "out_of_stock_count",
            "expiring_soon_count", "expired_count", "active_vendors_count",
            "inbound_this_month_count", "received_quantity_this_month",
        ]:
            self.assertIn(field, data, f"Missing field: {field}")

    def test_low_stock_count(self):
        # quantity=2 <= min_stock_level=5 → low stock
        StockLevel.objects.create(product=self.product, shop=self.shop, quantity=Decimal("2"))
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["low_stock_count"], 1)

    def test_out_of_stock_count(self):
        StockLevel.objects.create(product=self.product, shop=self.shop, quantity=Decimal("0"))
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["out_of_stock_count"], 1)

    def test_expiring_soon_count(self):
        soon = date.today() + timedelta(days=10)
        ProductBatch.objects.create(
            product=self.product, shop=self.shop,
            quantity=Decimal("5"), expiry_date=soon,
        )
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["expiring_soon_count"], 1)

    def test_expired_count(self):
        past = date.today() - timedelta(days=5)
        ProductBatch.objects.create(
            product=self.product, shop=self.shop,
            quantity=Decimal("3"), expiry_date=past,
        )
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["expired_count"], 1)

    def test_active_vendors_count(self):
        make_vendor(self.biz, "Vendor A")
        make_vendor(self.biz, "Vendor B")
        Vendor.objects.create(tenant=self.biz, name="Inactive", is_active=False)
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["active_vendors_count"], 2)

    def test_shop_id_filter_scopes_stock(self):
        shop2 = make_shop(self.biz, "Second Shop")
        product2 = make_product(self.biz, "Sugar", min_stock=5)
        StockLevel.objects.create(product=self.product, shop=self.shop, quantity=Decimal("2"))
        StockLevel.objects.create(product=product2, shop=shop2, quantity=Decimal("2"))
        res = self.client.get(SUMMARY_URL, {"shop_id": str(self.shop.id)})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["stock_items_count"], 1)

    def test_cashier_cannot_access(self):
        cashier = CustomUser.objects.create_user(
            phone="+249920000099", full_name="Cashier", role="cashier"
        )
        cashier.business = self.biz
        cashier.save(update_fields=["business", "updated_at"])
        res = auth_client(cashier).get(SUMMARY_URL)
        self.assertEqual(res.status_code, 403)


# ── InboundDetailView ─────────────────────────────────────────────────────────

class InboundDetailViewTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner("+249920000010")
        self.biz     = make_business(self.owner, self.plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz)
        self.client  = auth_client(self.owner)

        self.txn = InboundTransaction.objects.create(
            tenant=self.biz,
            shop=self.shop,
            vendor=self.vendor,
            reference="DETAIL-REF-001",
            notes="Test notes",
            created_by=self.owner,
        )
        InboundTransactionItem.objects.create(
            transaction=self.txn,
            product=self.product,
            quantity=Decimal("10"),
            unit_cost=Decimal("5.00"),
        )

    def test_returns_transaction_detail(self):
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 200)
        data = res.data["data"]
        self.assertEqual(data["reference"], "DETAIL-REF-001")
        self.assertEqual(data["notes"], "Test notes")

    def test_includes_vendor(self):
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.data["data"]["vendor"])
        self.assertEqual(res.data["data"]["vendor"]["name"], self.vendor.name)

    def test_includes_items(self):
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 200)
        items = res.data["data"]["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["quantity"], "10.000")

    def test_includes_created_by_name(self):
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["created_by_name"], self.owner.full_name)

    def test_404_for_cross_tenant(self):
        other_plan  = make_plan(name="OtherPlan")
        other_owner = make_owner("+249920000011")
        make_business(other_owner, other_plan, name="Other Biz")
        res = auth_client(other_owner).get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 404)

    def test_requires_feature(self):
        no_feat = make_plan(name="NoFeat", with_feature=False)
        self.biz.subscription_plan = no_feat
        self.biz.save(update_fields=["subscription_plan"])
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertIn(res.status_code, [400, 422])


# ── ExpiryReportView ──────────────────────────────────────────────────────────

class ExpiryReportViewTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner("+249920000020")
        self.biz     = make_business(self.owner, self.plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.client  = auth_client(self.owner)

        self.expiring_soon = date.today() + timedelta(days=10)
        self.expired_past  = date.today() - timedelta(days=5)

    def _make_batch(self, expiry, batch_number="LOT-001", shop=None):
        return ProductBatch.objects.create(
            product=self.product,
            shop=shop or self.shop,
            quantity=Decimal("5"),
            expiry_date=expiry,
            batch_number=batch_number,
        )

    def test_returns_paginated_results(self):
        self._make_batch(self.expiring_soon)
        res = self.client.get(EXPIRY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertIn("results", res.data)
        self.assertEqual(res.data["count"], 1)

    def test_expiring_soon_filter(self):
        self._make_batch(self.expiring_soon, "LOT-SOON")
        far_future = date.today() + timedelta(days=120)
        self._make_batch(far_future, "LOT-FAR")
        res = self.client.get(EXPIRY_URL, {"status": "expiring_soon"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["batch_number"], "LOT-SOON")

    def test_expired_filter(self):
        self._make_batch(self.expired_past, "LOT-EXP")
        self._make_batch(self.expiring_soon, "LOT-SOON")
        res = self.client.get(EXPIRY_URL, {"status": "expired"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["batch_number"], "LOT-EXP")

    def test_shop_filter(self):
        shop2 = make_shop(self.biz, "Shop 2")
        self._make_batch(self.expiring_soon, "LOT-S1", shop=self.shop)
        self._make_batch(self.expiring_soon, "LOT-S2", shop=shop2)
        res = self.client.get(EXPIRY_URL, {"shop_id": str(self.shop.id)})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)

    def test_search_by_batch_number(self):
        self._make_batch(self.expiring_soon, "BATCH-XYZ")
        self._make_batch(self.expiring_soon, "BATCH-ABC")
        res = self.client.get(EXPIRY_URL, {"search": "XYZ"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)

    def test_days_remaining_positive_for_future(self):
        self._make_batch(self.expiring_soon)
        res = self.client.get(EXPIRY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertGreater(res.data["results"][0]["days_remaining"], 0)

    def test_days_remaining_negative_for_expired(self):
        self._make_batch(self.expired_past)
        res = self.client.get(EXPIRY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertLess(res.data["results"][0]["days_remaining"], 0)

    def test_requires_feature(self):
        no_feat = make_plan(name="NoFeat2", with_feature=False)
        self.biz.subscription_plan = no_feat
        self.biz.save(update_fields=["subscription_plan"])
        res = self.client.get(EXPIRY_URL)
        self.assertIn(res.status_code, [400, 422])

    def test_tenant_isolation(self):
        other_plan  = make_plan(name="OtherPlan2")
        other_owner = make_owner("+249920000021")
        other_biz   = make_business(other_owner, other_plan, name="Other")
        other_shop  = make_shop(other_biz)
        other_prod  = make_product(other_biz, "Other Milk")
        ProductBatch.objects.create(
            product=other_prod, shop=other_shop,
            quantity=Decimal("5"), expiry_date=self.expiring_soon,
        )
        res = self.client.get(EXPIRY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 0)
