import uuid
from decimal import Decimal

from django.test import TestCase

from apps.accounts.models import CustomUser
from apps.tenants.models import Business


def make_owner(phone="+249900000010"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Owner", role="owner", is_active=True,
    )


def make_business(owner):
    return Business.objects.create(
        owner=owner, name="Tax Test Biz", slug=f"tax-test-biz-{uuid.uuid4().hex[:6]}",
        business_type="shop",
    )


class TestBusinessTaxFields(TestCase):
    def test_business_has_tax_fields_with_defaults(self):
        owner = make_owner()
        business = make_business(owner)
        self.assertFalse(business.tax_enabled)
        self.assertEqual(business.tax_name, "VAT")
        self.assertEqual(business.tax_rate, Decimal("0"))
        self.assertFalse(business.tax_inclusive)
