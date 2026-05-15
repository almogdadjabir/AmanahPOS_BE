"""
Tests for vendor management and vendor-gated inbound receiving.

Covers all 15 required test cases:
 1.  owner can create vendor
 2.  manager can create vendor
 3.  cashier cannot create vendor
 4.  vendor list is tenant-scoped
 5.  search vendor by name works
 6.  create inbound requires vendor_id
 7.  inactive vendor cannot be used in inbound
 8.  cross-tenant vendor is rejected
 9.  inbound response includes vendor
10.  inbound list can filter by vendor_id
11.  duplicate reference behavior still works
12.  stock increment still works
13.  movement creation still works
14.  batch creation still works
15.  feature disabled still blocks inbound even with valid vendor
"""
import uuid
from decimal import Decimal
from datetime import date, timedelta

from django.test import TestCase

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import CustomUser
from apps.inventory.models import (
    InboundTransaction,
    InboundTransactionItem,
    MovementType,
    ProductBatch,
    StockLevel,
    StockMovement,
    Vendor,
)
from apps.products.models import Product
from apps.subscriptions.models import Plan
from apps.tenants.models import Business, BusinessType, Shop


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_plan(name="Business", with_inbound=True):
    features = {"inventory_inbound_receiving": True} if with_inbound else {}
    return Plan.objects.create(
        name=name, price="0", currency="SDG", features=features, is_free=True,
    )


def _user(phone, role, business=None):
    u = CustomUser.objects.create_user(phone=phone, full_name="Test", role=role)
    if business:
        u.business = business
        u.save(update_fields=["business", "updated_at"])
    return u


def make_owner(phone="+249910000001"):
    return _user(phone, "owner")


def make_business(owner, plan, name="Shop Biz"):
    b = Business.objects.create(
        name=name, owner=owner, business_type=BusinessType.SHOP, subscription_plan=plan,
    )
    owner.business = b
    owner.save(update_fields=["business", "updated_at"])
    return b


def make_shop(business, name="Main Shop"):
    return Shop.objects.create(name=name, business=business)


def make_product(tenant, name="Milk"):
    return Product.objects.create(tenant=tenant, name=name, price="1.00", track_inventory=True)


def make_vendor(tenant, name="Al Noor", is_active=True):
    return Vendor.objects.create(
        tenant=tenant, name=name,
        phone="+249910100001", email="vendor@example.com",
        is_active=is_active,
    )


def auth_client(user):
    c = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return c


VENDOR_LIST_URL  = "/api/v1/inventory/vendors/"
INBOUND_URL      = "/api/v1/inventory/inbound/"
SUMMARY_URL      = "/api/v1/inventory/inbound/vendor-summary/"


def vendor_detail_url(pk):
    return f"/api/v1/inventory/vendors/{pk}/"


def _inbound_payload(shop, vendor, product, reference="PO-001"):
    return {
        "shop_id":   str(shop.id),
        "vendor_id": str(vendor.id),
        "reference": reference,
        "notes":     "test delivery",
        "items": [{"product_id": str(product.id), "quantity": "10.000"}],
    }


# ── 1. Owner can create vendor ────────────────────────────────────────────────

class VendorCreateOwnerTest(TestCase):
    def setUp(self):
        self.plan  = make_plan()
        self.owner = make_owner()
        self.biz   = make_business(self.owner, self.plan)

    def test_owner_can_create_vendor(self):
        res = auth_client(self.owner).post(VENDOR_LIST_URL, {"name": "Nile Traders"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["success"])
        self.assertEqual(res.data["data"]["name"], "Nile Traders")
        self.assertTrue(Vendor.objects.filter(tenant=self.biz, name="Nile Traders").exists())


# ── 2. Manager can create vendor ──────────────────────────────────────────────

class VendorCreateManagerTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, self.plan)
        self.manager = _user("+249910000002", "manager", self.biz)

    def test_manager_can_create_vendor(self):
        res = auth_client(self.manager).post(VENDOR_LIST_URL, {"name": "Blue River Supply"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["data"]["name"], "Blue River Supply")


# ── 3. Cashier cannot create vendor ──────────────────────────────────────────

class VendorCashierBlockedTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, self.plan)
        self.cashier = _user("+249910000003", "cashier", self.biz)

    def test_cashier_cannot_create_vendor(self):
        res = auth_client(self.cashier).post(VENDOR_LIST_URL, {"name": "Cashier Vendor"}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_cashier_cannot_list_vendors(self):
        res = auth_client(self.cashier).get(VENDOR_LIST_URL)
        self.assertEqual(res.status_code, 403)


# ── 4. Vendor list is tenant-scoped ──────────────────────────────────────────

class VendorTenantScopeTest(TestCase):
    def setUp(self):
        plan         = make_plan()
        self.owner_a = make_owner("+249910000010")
        self.biz_a   = make_business(self.owner_a, plan, name="Biz A")
        self.vendor_a = make_vendor(self.biz_a, name="Vendor A")

        self.owner_b = make_owner("+249910000011")
        self.biz_b   = make_business(self.owner_b, plan, name="Biz B")
        make_vendor(self.biz_b, name="Vendor B")

    def test_vendor_list_only_shows_own_tenant(self):
        res = auth_client(self.owner_a).get(VENDOR_LIST_URL)
        self.assertEqual(res.status_code, 200)
        names = [v["name"] for v in res.data["results"]]
        self.assertIn("Vendor A", names)
        self.assertNotIn("Vendor B", names)


# ── 5. Search vendor by name ──────────────────────────────────────────────────

class VendorSearchTest(TestCase):
    def setUp(self):
        plan        = make_plan()
        self.owner  = make_owner()
        self.biz    = make_business(self.owner, plan)
        make_vendor(self.biz, name="Al Noor Groceries")
        make_vendor(self.biz, name="Blue Wave Import")

    def test_search_by_name_returns_match(self):
        res = auth_client(self.owner).get(VENDOR_LIST_URL, {"search": "noor"})
        self.assertEqual(res.status_code, 200)
        names = [v["name"] for v in res.data["results"]]
        self.assertIn("Al Noor Groceries", names)
        self.assertNotIn("Blue Wave Import", names)

    def test_search_no_match_returns_empty(self):
        res = auth_client(self.owner).get(VENDOR_LIST_URL, {"search": "zzznomatch"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 0)


# ── 6. Create inbound requires vendor_id ─────────────────────────────────────

class InboundRequiresVendorTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, self.plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)

    def test_inbound_without_vendor_id_returns_400(self):
        payload = {
            "shop_id":   str(self.shop.id),
            "reference": "REF-NO-VENDOR",
            "items": [{"product_id": str(self.product.id), "quantity": "5.000"}],
        }
        res = auth_client(self.owner).post(INBOUND_URL, payload, format="json")
        self.assertEqual(res.status_code, 400)


# ── 7. Inactive vendor cannot be used ────────────────────────────────────────

class InboundInactiveVendorTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, self.plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz, is_active=False)

    def test_inactive_vendor_returns_400(self):
        payload = _inbound_payload(self.shop, self.vendor, self.product)
        res = auth_client(self.owner).post(INBOUND_URL, payload, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("inactive", res.data["message"].lower())


# ── 8. Cross-tenant vendor is rejected ───────────────────────────────────────

class InboundCrossTenantVendorTest(TestCase):
    def setUp(self):
        plan          = make_plan()
        self.owner_a  = make_owner("+249910000020")
        self.biz_a    = make_business(self.owner_a, plan, name="Biz A")
        self.shop_a   = make_shop(self.biz_a)
        self.product_a = make_product(self.biz_a)

        self.owner_b  = make_owner("+249910000021")
        self.biz_b    = make_business(self.owner_b, plan, name="Biz B")
        self.vendor_b = make_vendor(self.biz_b, name="Biz B Vendor")

    def test_cross_tenant_vendor_returns_404(self):
        payload = _inbound_payload(self.shop_a, self.vendor_b, self.product_a)
        res = auth_client(self.owner_a).post(INBOUND_URL, payload, format="json")
        self.assertEqual(res.status_code, 404)


# ── 9. Inbound response includes vendor ──────────────────────────────────────

class InboundResponseIncludesVendorTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, self.plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz)

    def test_response_includes_vendor(self):
        payload = _inbound_payload(self.shop, self.vendor, self.product)
        res = auth_client(self.owner).post(INBOUND_URL, payload, format="json")
        self.assertEqual(res.status_code, 201)
        data = res.data["data"]
        self.assertIn("vendor", data)
        self.assertEqual(data["vendor"]["id"], str(self.vendor.id))
        self.assertEqual(data["vendor"]["name"], self.vendor.name)

    def test_total_quantity_in_response(self):
        payload = _inbound_payload(self.shop, self.vendor, self.product)
        res = auth_client(self.owner).post(INBOUND_URL, payload, format="json")
        self.assertEqual(res.data["data"]["total_quantity"], "10.000")


# ── 10. Inbound list can filter by vendor_id ─────────────────────────────────

class InboundFilterByVendorTest(TestCase):
    def setUp(self):
        plan         = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.v1      = make_vendor(self.biz, name="Vendor One")
        self.v2      = make_vendor(self.biz, name="Vendor Two")
        client       = auth_client(self.owner)
        client.post(INBOUND_URL, _inbound_payload(self.shop, self.v1, self.product, "REF-V1"), format="json")
        client.post(INBOUND_URL, _inbound_payload(self.shop, self.v2, self.product, "REF-V2"), format="json")

    def test_filter_returns_only_matching_vendor(self):
        res = auth_client(self.owner).get(INBOUND_URL, {"vendor_id": str(self.v1.id)})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["vendor"]["name"], "Vendor One")

    def test_list_without_filter_returns_all(self):
        res = auth_client(self.owner).get(INBOUND_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 2)


# ── 11. Duplicate reference still rejected ───────────────────────────────────

class InboundDuplicateReferenceTest(TestCase):
    def setUp(self):
        plan         = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz)
        auth_client(self.owner).post(
            INBOUND_URL,
            _inbound_payload(self.shop, self.vendor, self.product, "DUP-REF"),
            format="json",
        )

    def test_duplicate_reference_returns_400(self):
        res = auth_client(self.owner).post(
            INBOUND_URL,
            _inbound_payload(self.shop, self.vendor, self.product, "DUP-REF"),
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("already exists", res.data["message"])


# ── 12. Stock increment still works ──────────────────────────────────────────

class InboundStockIncrementTest(TestCase):
    def setUp(self):
        plan         = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz)

    def test_stock_level_incremented_after_inbound(self):
        payload = _inbound_payload(self.shop, self.vendor, self.product)
        auth_client(self.owner).post(INBOUND_URL, payload, format="json")
        level = StockLevel.objects.get(product=self.product, shop=self.shop)
        self.assertEqual(level.quantity, Decimal("10.000"))

    def test_two_inbounds_accumulate_stock(self):
        client = auth_client(self.owner)
        client.post(INBOUND_URL, _inbound_payload(self.shop, self.vendor, self.product, "REF-A"), format="json")
        client.post(INBOUND_URL, _inbound_payload(self.shop, self.vendor, self.product, "REF-B"), format="json")
        level = StockLevel.objects.get(product=self.product, shop=self.shop)
        self.assertEqual(level.quantity, Decimal("20.000"))


# ── 13. Movement creation still works ────────────────────────────────────────

class InboundMovementTest(TestCase):
    def setUp(self):
        plan         = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz, name="Audit Vendor")

    def test_stock_movement_created_with_vendor_in_notes(self):
        payload = _inbound_payload(self.shop, self.vendor, self.product)
        auth_client(self.owner).post(INBOUND_URL, payload, format="json")
        mv = StockMovement.objects.get(product=self.product, shop=self.shop)
        self.assertEqual(mv.movement_type, MovementType.IN)
        self.assertIn("Audit Vendor", mv.notes)
        self.assertIn("PO-001", mv.notes)


# ── 14. Batch creation still works ───────────────────────────────────────────

class InboundBatchTest(TestCase):
    def setUp(self):
        plan         = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz)

    def test_batch_created_when_expiry_provided(self):
        expiry = str(date.today() + timedelta(days=90))
        payload = {
            "shop_id":   str(self.shop.id),
            "vendor_id": str(self.vendor.id),
            "reference": "BATCH-REF",
            "items": [{
                "product_id":   str(self.product.id),
                "quantity":     "5.000",
                "expiry_date":  expiry,
                "batch_number": "LOT-001",
            }],
        }
        auth_client(self.owner).post(INBOUND_URL, payload, format="json")
        batch = ProductBatch.objects.get(product=self.product, shop=self.shop)
        self.assertEqual(batch.batch_number, "LOT-001")
        self.assertEqual(batch.quantity, Decimal("5.000"))

    def test_no_batch_when_expiry_absent(self):
        payload = _inbound_payload(self.shop, self.vendor, self.product, "NO-BATCH-REF")
        auth_client(self.owner).post(INBOUND_URL, payload, format="json")
        self.assertFalse(ProductBatch.objects.filter(product=self.product).exists())


# ── 15. Feature disabled still blocks inbound ────────────────────────────────

class InboundFeatureDisabledTest(TestCase):
    def setUp(self):
        plan         = make_plan(with_inbound=False)
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz)

    def test_feature_disabled_blocks_even_with_valid_vendor(self):
        payload = _inbound_payload(self.shop, self.vendor, self.product)
        res = auth_client(self.owner).post(INBOUND_URL, payload, format="json")
        self.assertIn(res.status_code, [400, 422])
        self.assertEqual(InboundTransaction.objects.count(), 0)


# ── Vendor CRUD ───────────────────────────────────────────────────────────────

class VendorCRUDTest(TestCase):
    def setUp(self):
        plan        = make_plan()
        self.owner  = make_owner()
        self.biz    = make_business(self.owner, plan)
        self.vendor = make_vendor(self.biz)
        self.client = auth_client(self.owner)

    def test_get_vendor_detail(self):
        res = self.client.get(vendor_detail_url(self.vendor.id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["name"], self.vendor.name)

    def test_patch_vendor(self):
        res = self.client.patch(vendor_detail_url(self.vendor.id), {"phone": "+249912999999"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.phone, "+249912999999")

    def test_delete_vendor_soft_deactivates(self):
        res = self.client.delete(vendor_detail_url(self.vendor.id))
        self.assertEqual(res.status_code, 200)
        self.vendor.refresh_from_db()
        self.assertFalse(self.vendor.is_active)

    def test_duplicate_vendor_name_rejected(self):
        res = self.client.post(VENDOR_LIST_URL, {"name": self.vendor.name}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_filter_active_vendors(self):
        make_vendor(self.biz, name="Inactive One", is_active=False)
        res = self.client.get(VENDOR_LIST_URL, {"is_active": "true"})
        names = [v["name"] for v in res.data["results"]]
        self.assertIn(self.vendor.name, names)
        self.assertNotIn("Inactive One", names)


# ── Vendor summary endpoint ───────────────────────────────────────────────────

class VendorSummaryTest(TestCase):
    def setUp(self):
        plan         = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz)
        client       = auth_client(self.owner)
        client.post(INBOUND_URL, _inbound_payload(self.shop, self.vendor, self.product, "S1"), format="json")
        client.post(INBOUND_URL, _inbound_payload(self.shop, self.vendor, self.product, "S2"), format="json")

    def test_summary_totals(self):
        res = auth_client(self.owner).get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        data = res.data["data"]
        self.assertEqual(data["total_transactions"], 2)
        self.assertEqual(data["vendors"][0]["vendor_name"], self.vendor.name)
        self.assertEqual(data["vendors"][0]["transactions_count"], 2)
