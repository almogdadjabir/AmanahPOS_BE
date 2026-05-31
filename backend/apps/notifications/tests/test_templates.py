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


class TestRenderNotification(TestCase):
    def test_render_defaults_to_english(self):
        from apps.notifications.notification_templates import render_notification
        result = render_notification("welcome")
        self.assertIn("Welcome", result["title"])

    def test_render_arabic_via_locale_param(self):
        from apps.notifications.notification_templates import render_notification
        result = render_notification("welcome", locale="ar")
        self.assertIn("مرحبًا", result["title"])

    def test_render_substitutes_variables(self):
        from apps.notifications.notification_templates import render_notification
        result = render_notification("low_stock", locale="en",
                                     product_name="Milk", shop_name="Main",
                                     current_qty=3, min_qty=10)
        self.assertIn("Milk", result["body"])
        self.assertIn("3", result["body"])

    def test_render_arabic_substitutes_variables(self):
        from apps.notifications.notification_templates import render_notification
        result = render_notification("low_stock", locale="ar",
                                     product_name="حليب", shop_name="الفرع",
                                     current_qty=3, min_qty=10)
        self.assertIn("حليب", result["body"])

    def test_render_falls_back_when_db_template_disabled(self):
        from apps.notifications.models import NotificationTemplate
        from apps.notifications.notification_templates import render_notification
        NotificationTemplate.objects.filter(key="welcome").update(is_enabled=False)
        # Should fall back to hardcoded (English only)
        result = render_notification("welcome")
        self.assertIn("Welcome", result["title"])
        # Restore
        NotificationTemplate.objects.filter(key="welcome").update(is_enabled=True)

    def test_render_raises_for_unknown_key(self):
        from apps.notifications.notification_templates import render_notification
        with self.assertRaises(KeyError):
            render_notification("this_key_does_not_exist_anywhere_at_all")
