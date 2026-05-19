"""
Tests: sale receipts, transaction history search, offline sync receipt_number, returns.
"""
import uuid
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.tenants.models import Business, Shop
from apps.products.models import Product, Category
from apps.inventory.models import StockLevel
from apps.sales.models import Sale, SaleItem, SaleStatus


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_owner(phone="+249900000001"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Owner", role="owner", is_active=True,
    )


def make_business(owner):
    return Business.objects.create(
        owner=owner, name="Test Biz", slug=f"test-biz-{uuid.uuid4().hex[:6]}",
        business_type="shop",
    )


def make_shop(business):
    return Shop.objects.create(business=business, name="Main Shop", is_main=True, is_active=True)


def make_category(business):
    return Category.objects.create(tenant=business, name="Drinks", is_active=True)


def make_product(business, price="600.00", track_inventory=True):
    return Product.objects.create(
        tenant=business, name="Pepsi 500ml", sku=f"SKU-{uuid.uuid4().hex[:6]}",
        price=Decimal(price), track_inventory=track_inventory, is_active=True,
        category=make_category(business),
    )


def seed_stock(product, shop, qty=10):
    StockLevel.objects.create(product=product, shop=shop, quantity=qty)


def make_auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def create_sale_via_api(client, shop, product, qty=2):
    return client.post("/api/v1/sales/", {
        "shop": str(shop.id),
        "items": [{"product_id": str(product.id), "quantity": str(qty)}],
        "payment_method": "cash",
    }, format="json")


# ─── Task 1: receipt_number in sale create response ───────────────────────────

class TestSaleCreateReceiptNumber(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)
        seed_stock(self.product, self.shop, 10)
        self.client = make_auth_client(self.owner)

    def test_receipt_number_in_create_response(self):
        """POST /api/v1/sales/ response must include receipt_number."""
        resp = create_sale_via_api(self.client, self.shop, self.product)
        self.assertEqual(resp.status_code, 201)
        self.assertIn("receipt_number", resp.data["data"])
        self.assertIsNotNone(resp.data["data"]["receipt_number"])


# ─── Task 2: sale list search ─────────────────────────────────────────────────

class TestSaleListSearch(TestCase):
    def setUp(self):
        from apps.customers.models import Customer
        self.owner = make_owner("+249900000002")
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)
        seed_stock(self.product, self.shop, 50)
        self.client = make_auth_client(self.owner)
        self.customer = Customer.objects.create(
            tenant=self.business, name="Ali Mohamed", phone="+249911111111"
        )
        # Create 2 sales: one with customer, one without
        resp1 = self.client.post("/api/v1/sales/", {
            "shop": str(self.shop.id),
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
            "payment_method": "cash",
            "customer": str(self.customer.id),
        }, format="json")
        self.sale1_receipt = resp1.data["data"]["receipt_number"]

        resp2 = self.client.post("/api/v1/sales/", {
            "shop": str(self.shop.id),
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
            "payment_method": "credit",
        }, format="json")
        self.sale2_receipt = resp2.data["data"]["receipt_number"]

    def test_search_by_receipt_number(self):
        resp = self.client.get(f"/api/v1/sales/?search={self.sale1_receipt}")
        self.assertEqual(resp.status_code, 200)
        receipts = [s["receipt_number"] for s in resp.data["results"]]
        self.assertIn(self.sale1_receipt, receipts)

    def test_search_by_customer_name(self):
        resp = self.client.get("/api/v1/sales/?search=Ali")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.data["results"]), 1)
        receipts = [s["receipt_number"] for s in resp.data["results"]]
        self.assertIn(self.sale1_receipt, receipts)
        self.assertNotIn(self.sale2_receipt, receipts)

    def test_filter_by_payment_method(self):
        resp = self.client.get("/api/v1/sales/?payment_method=credit")
        self.assertEqual(resp.status_code, 200)
        for sale in resp.data["results"]:
            self.assertEqual(sale["payment_method"], "credit")


# ─── Task 3: offline sync receipt_number ─────────────────────────────────────

class TestOfflineSyncReceiptNumber(TestCase):
    def setUp(self):
        self.owner = make_owner("+249900000003")
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)
        seed_stock(self.product, self.shop, 50)
        self.client = make_auth_client(self.owner)

    def test_offline_sync_result_includes_receipt_number(self):
        payload = {"sales": [{
            "client_sale_id": str(uuid.uuid4()),
            "shop": str(self.shop.id),
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
            "payment_method": "cash",
        }]}
        resp = self.client.post("/api/v1/sales/offline-sync/", payload, format="json")
        self.assertEqual(resp.status_code, 200)
        result = resp.data["results"][0]
        self.assertEqual(result["status"], "synced")
        self.assertIn("receipt_number", result)
        self.assertIsNotNone(result["receipt_number"])

    def test_idempotent_sync_also_includes_receipt_number(self):
        client_id = str(uuid.uuid4())
        payload = {"sales": [{
            "client_sale_id": client_id,
            "shop": str(self.shop.id),
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
            "payment_method": "cash",
        }]}
        # First sync
        self.client.post("/api/v1/sales/offline-sync/", payload, format="json")
        # Second sync (idempotent)
        resp = self.client.post("/api/v1/sales/offline-sync/", payload, format="json")
        result = resp.data["results"][0]
        self.assertEqual(result["status"], "synced")
        self.assertIn("receipt_number", result)
        self.assertIsNotNone(result["receipt_number"])
