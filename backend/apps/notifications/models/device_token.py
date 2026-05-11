import uuid

from django.db import models


class Platform(models.TextChoices):
    ANDROID = "android", "Android"
    IOS     = "ios",     "iOS"
    WEB     = "web",     "Web"


class DeviceToken(models.Model):
    """FCM device token for a user's registered device."""

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="device_tokens",
        db_index=True,
    )
    token      = models.CharField(max_length=512, unique=True)
    platform   = models.CharField(max_length=10, choices=Platform.choices, db_index=True)
    device_id  = models.CharField(max_length=255, null=True, blank=True)
    app_version = models.CharField(max_length=50, null=True, blank=True)
    is_active  = models.BooleanField(default=True, db_index=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notifications_device_tokens"
        verbose_name = "Device Token"
        verbose_name_plural = "Device Tokens"
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        return f"{self.user} [{self.platform}] active={self.is_active}"

    def deactivate(self) -> None:
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])
