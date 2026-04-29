import uuid

from django.db import models
from django.utils import timezone

from apps.core.managers import SoftDeleteManager, AllObjectsManager


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def soft_delete(self, using=None):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)

    def delete(self, using=None, keep_parents=False):
        self.soft_delete()


class TenantModel(BaseModel):
    tenant = models.ForeignKey(
        "tenants.Business",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
        db_index=True,
    )

    class Meta(BaseModel.Meta):
        abstract = True
