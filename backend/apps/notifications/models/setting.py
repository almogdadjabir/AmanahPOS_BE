from django.db import models


class NotificationSetting(models.Model):
    key         = models.CharField(max_length=100, primary_key=True)
    value       = models.TextField()
    description = models.CharField(max_length=500, blank=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notifications_settings"
        verbose_name = "Notification Setting"
        verbose_name_plural = "Notification Settings"

    def __str__(self):
        return f"{self.key}={self.value}"

    @classmethod
    def get(cls, key: str, default: str = "") -> str:
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default

    @classmethod
    def get_bool(cls, key: str, default: bool = True) -> bool:
        return cls.get(key, str(default)).lower() in ("true", "1", "yes")

    @classmethod
    def ensure_defaults(cls) -> None:
        """Seed default settings if they don't exist."""
        defaults = [
            ("push_enabled",    "true",  "Enable/disable all push notifications globally"),
            ("sms_enabled",     "true",  "Enable/disable all SMS notifications globally"),
            ("push_daily_limit","1000",  "Max push notifications sent per day"),
            ("sms_daily_limit", "500",   "Max SMS messages sent per day"),
        ]
        for key, value, description in defaults:
            cls.objects.get_or_create(key=key, defaults={"value": value, "description": description})
