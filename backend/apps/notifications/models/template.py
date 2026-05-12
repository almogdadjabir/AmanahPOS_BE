import uuid
from django.db import models


class NotificationTemplate(models.Model):
    class Channel(models.TextChoices):
        PUSH = "push", "Push"
        SMS  = "sms",  "SMS"
        BOTH = "both", "Both"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key        = models.CharField(max_length=100, unique=True)
    name       = models.CharField(max_length=200)
    category   = models.CharField(max_length=50, db_index=True)
    channel    = models.CharField(max_length=10, choices=Channel.choices, default=Channel.PUSH)
    title_en   = models.CharField(max_length=255)
    body_en    = models.TextField()
    title_ar   = models.CharField(max_length=255)
    body_ar    = models.TextField()
    variables  = models.JSONField(default=list, blank=True)
    is_enabled = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notifications_templates"
        verbose_name = "Notification Template"
        verbose_name_plural = "Notification Templates"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.key} [{self.channel}]"

    def render(self, locale: str = "en", **kwargs) -> dict:
        """Return rendered title/body for the given locale."""
        if locale == "ar":
            title = self.title_ar or self.title_en
            body  = self.body_ar  or self.body_en
        else:
            title = self.title_en
            body  = self.body_en
        return {
            "title": title.format(**kwargs) if kwargs else title,
            "body":  body.format(**kwargs)  if kwargs else body,
            "notification_type": self.category,
        }
