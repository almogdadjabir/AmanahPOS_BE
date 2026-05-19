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
