from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    model = CustomUser
    list_display = ["phone", "full_name", "email", "role", "is_verified", "is_active", "created_at"]
    list_filter = ["role", "is_verified", "is_active", "is_staff", "is_superuser"]
    search_fields = ["phone", "full_name", "email"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at", "last_login_at"]

    fieldsets = (
        (None, {"fields": ("id", "phone", "password")}),
        ("Personal Info", {"fields": ("full_name", "email")}),
        ("Role & Status", {"fields": ("role", "is_verified", "has_password", "is_active")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_login_at")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("phone", "full_name", "email", "role", "password1", "password2"),
        }),
    )
