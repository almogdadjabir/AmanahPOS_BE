import uuid

from django.db import models


class AuditLog(models.Model):
    class ActionChoices(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        VIEW = "view", "View"
        EXPORT = "export", "Export"
        APPROVE = "approve", "Approve"
        REJECT = "reject", "Reject"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.CustomUser", null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs", db_index=True)
    action = models.CharField(max_length=20, choices=ActionChoices.choices, db_index=True)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.CharField(max_length=100, blank=True, db_index=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    endpoint = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, blank=True)
    extra = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_logs"
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["model_name", "object_id"]),
            models.Index(fields=["action", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.action}] {self.model_name}({self.object_id}) by {self.user} at {self.created_at}"


def log_action(user=None, action="other", model_name="", object_id="", changes=None, ip_address=None, extra=None, request=None) -> AuditLog:
    kwargs = {
        "user": user,
        "action": action,
        "model_name": model_name,
        "object_id": str(object_id) if object_id else "",
        "changes": changes or {},
        "ip_address": ip_address,
        "extra": extra or {},
    }
    if request:
        kwargs["ip_address"] = _get_client_ip(request)
        kwargs["user_agent"] = request.META.get("HTTP_USER_AGENT", "")[:500]
        kwargs["endpoint"] = request.path[:500]
        kwargs["method"] = request.method
    return AuditLog.objects.create(**kwargs)


def _get_client_ip(request) -> str | None:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
