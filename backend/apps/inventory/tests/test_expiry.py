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
