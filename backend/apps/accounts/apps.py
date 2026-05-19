from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    label = "accounts"
    verbose_name = "Accounts"

    def ready(self):
        self._check_test_phone_safety()

    @staticmethod
    def _check_test_phone_safety():
        from django.conf import settings
        from django.core.exceptions import ImproperlyConfigured
        if not settings.DEBUG and getattr(settings, "TEST_PHONE", ""):
            raise ImproperlyConfigured(
                "TEST_PHONE must not be set when DEBUG=False. "
                "Remove TEST_PHONE from your production environment variables."
            )
