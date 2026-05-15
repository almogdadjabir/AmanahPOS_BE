"""
Tests: enabled_features field in GET /api/v1/auth/profile/
"""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.subscriptions.models import Plan
from apps.tenants.models import Business, BusinessType, Shop


PROFILE_URL = "/api/v1/auth/profile/"


def make_plan(features=None):
    return Plan.objects.create(
        name="TestPlan",
        price="0",
        currency="SDG",
        features=features or {},
        is_free=True,
    )


def make_owner(phone="+249912200001"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Owner", role="owner"
    )


def make_business(owner, plan):
    b = Business.objects.create(
        name="Test Biz",
        owner=owner,
        business_type=BusinessType.SHOP,
        subscription_plan=plan,
    )
    owner.business = b
    owner.save(update_fields=["business", "updated_at"])
    return b


class ProfileFeaturesTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_enabled_features_present_in_profile(self):
        plan = make_plan(features={"inventory_inbound_receiving": True})
        owner = make_owner()
        make_business(owner, plan)
        self.client.force_authenticate(user=owner)

        resp = self.client.get(PROFILE_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("enabled_features", resp.data["data"])
        self.assertTrue(resp.data["data"]["enabled_features"]["inventory_inbound_receiving"])

    def test_enabled_features_empty_for_no_plan(self):
        owner = make_owner(phone="+249912200002")
        b = Business.objects.create(name="NoPlanBiz", owner=owner, business_type=BusinessType.SHOP)
        owner.business = b
        owner.save(update_fields=["business", "updated_at"])
        self.client.force_authenticate(user=owner)

        resp = self.client.get(PROFILE_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["data"]["enabled_features"], {})

    def test_enabled_features_false_feature_not_included(self):
        plan = make_plan(features={"inventory_inbound_receiving": False})
        owner = make_owner(phone="+249912200003")
        make_business(owner, plan)
        self.client.force_authenticate(user=owner)

        resp = self.client.get(PROFILE_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["data"]["enabled_features"].get("inventory_inbound_receiving", True))
