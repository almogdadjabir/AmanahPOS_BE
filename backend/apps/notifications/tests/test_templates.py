from django.test import TestCase


class TestNotificationTemplateSeeding(TestCase):
    def test_six_templates_exist(self):
        from apps.notifications.models import NotificationTemplate
        self.assertEqual(NotificationTemplate.objects.count(), 6)

    def test_all_templates_have_arabic_content(self):
        from apps.notifications.models import NotificationTemplate
        for tmpl in NotificationTemplate.objects.all():
            self.assertTrue(tmpl.title_ar, f"Template {tmpl.key} has no Arabic title")
            self.assertTrue(tmpl.body_ar,  f"Template {tmpl.key} has no Arabic body")

    def test_render_returns_arabic_for_ar_locale(self):
        from apps.notifications.models import NotificationTemplate
        tmpl = NotificationTemplate.objects.get(key="welcome")
        result = tmpl.render(locale="ar")
        self.assertIn("مرحبًا", result["title"])

    def test_render_returns_english_for_en_locale(self):
        from apps.notifications.models import NotificationTemplate
        tmpl = NotificationTemplate.objects.get(key="welcome")
        result = tmpl.render(locale="en")
        self.assertIn("Welcome", result["title"])
