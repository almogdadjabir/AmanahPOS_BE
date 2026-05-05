import uuid

from django.db import models


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Business",
        on_delete=models.CASCADE,
        related_name="categories",
        db_index=True,
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
        db_index=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.CharField(max_length=500, blank=True, null=True, default=None)
    thumbnail = models.CharField(max_length=500, blank=True, null=True, default=None)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products_categories"
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
            models.Index(fields=["tenant", "parent"]),
        ]
        unique_together = [["tenant", "name", "parent"]]

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name

    @property
    def is_root(self) -> bool:
        return self.parent_id is None

    def get_ancestors(self):
        ancestors = []
        current = self
        while current.parent_id:
            current = current.parent
            ancestors.insert(0, current)
        return ancestors
