"""
Custom DRF permissions for AmanaPOS.
"""
from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """User must have the 'owner' role."""
    message = "Only business owners can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "owner"
        )

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "owner"):
            return obj.owner == request.user
        if hasattr(obj, "tenant"):
            return obj.tenant.owner == request.user
        return request.user.role == "owner"


class IsManagerOrAbove(BasePermission):
    """User must be manager or owner."""
    message = "Managers and owners only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("manager", "owner")
        )


class IsCashierOrAbove(BasePermission):
    """Any authenticated staff member (cashier, manager, owner)."""
    message = "Staff access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("cashier", "manager", "owner")
        )


class HasBusiness(BasePermission):
    """Owner must have created a business before this action."""
    message = "You need to create a business first."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.business_id is not None
        )


class IsTenantMember(BasePermission):
    """User belongs to the same tenant as the object."""
    message = "You do not have access to this resource."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        user_biz_id = request.user.business_id
        obj_biz_id = getattr(obj, "tenant_id", None) or getattr(obj, "business_id", None)
        if obj_biz_id is None:
            return True
        return str(user_biz_id) == str(obj_biz_id)


class IsVerified(BasePermission):
    """User's phone must be verified."""
    message = "Your account has not been verified."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_verified
        )
