"""
Custom model managers for soft-delete support.
"""
from django.db import models


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet that filters out soft-deleted records by default."""

    def alive(self):
        """Return only non-deleted records."""
        return self.filter(is_deleted=False)

    def deleted(self):
        """Return only soft-deleted records."""
        return self.filter(is_deleted=True)

    def soft_delete(self):
        """Soft-delete all records in the queryset."""
        from django.utils import timezone
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def restore(self):
        """Restore all soft-deleted records in the queryset."""
        return self.update(is_deleted=False, deleted_at=None)


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted records from all queries."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=False)

    def alive(self):
        return self.get_queryset().alive()

    def deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db).deleted()


class AllObjectsManager(models.Manager):
    """Manager that includes soft-deleted records (use for admin/audit purposes)."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)

    def alive(self):
        return self.get_queryset().alive()

    def deleted(self):
        return self.get_queryset().deleted()
