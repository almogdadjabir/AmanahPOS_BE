import uuid

from django.db import models


class ActivityLog(models.Model):
    class ActionType(models.TextChoices):
        OWNER_CREATED        = "owner_created",        "Owner Created"
        OWNER_UPDATED        = "owner_updated",        "Owner Updated"
        OWNER_ACTIVATED      = "owner_activated",      "Owner Activated"
        OWNER_DEACTIVATED    = "owner_deactivated",    "Owner Deactivated"
        BUSINESS_CREATED     = "business_created",     "Business Created"
        BUSINESS_UPDATED     = "business_updated",     "Business Updated"
        BUSINESS_ACTIVATED   = "business_activated",   "Business Activated"
        BUSINESS_DEACTIVATED = "business_deactivated", "Business Deactivated"
        SUBSCRIPTION_CREATED      = "subscription_created",      "Subscription Created"
        SUBSCRIPTION_UPDATED      = "subscription_updated",      "Subscription Updated"
        SUBSCRIPTION_DEACTIVATED  = "subscription_deactivated",  "Subscription Deactivated"
        PLAN_CREATED     = "plan_created",     "Plan Created"
        PLAN_UPDATED     = "plan_updated",     "Plan Updated"
        PLAN_ACTIVATED   = "plan_activated",   "Plan Activated"
        PLAN_DEACTIVATED = "plan_deactivated", "Plan Deactivated"

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor        = models.ForeignKey(
        "accounts.CustomUser",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
        db_index=True,
    )
    action       = models.CharField(max_length=50, choices=ActionType.choices, db_index=True)
    entity_type  = models.CharField(max_length=50, db_index=True)
    entity_id    = models.CharField(max_length=100, blank=True, db_index=True)
    entity_label = models.CharField(max_length=255, blank=True)
    description  = models.TextField(blank=True)
    metadata     = models.JSONField(default=dict, blank=True)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table         = "activity_logs"
        verbose_name     = "Activity Log"
        verbose_name_plural = "Activity Logs"
        ordering         = ["-created_at"]
        indexes = [
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"[{self.action}] {self.entity_label} by {self.actor} at {self.created_at}"
