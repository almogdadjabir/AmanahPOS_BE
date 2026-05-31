from django.test import TestCase
from apps.accounts.models import CustomUser


class TestUserLanguageField(TestCase):
    def test_language_defaults_to_en(self):
        user = CustomUser.objects.create(phone="+249911111111", full_name="Test")
        self.assertEqual(user.language, "en")

    def test_language_can_be_set_to_ar(self):
        user = CustomUser.objects.create(phone="+249911111112", full_name="Test", language="ar")
        self.assertEqual(user.language, "ar")

    def test_language_field_in_profile_serializer(self):
        from apps.accounts.serializers import UserProfileSerializer
        user = CustomUser.objects.create(phone="+249911111113", full_name="Test")
        data = UserProfileSerializer(user).data
        self.assertIn("language", data)
        self.assertEqual(data["language"], "en")
