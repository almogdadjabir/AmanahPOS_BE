# Coding Conventions

**Analysis Date:** 2026-05-19

## Response Format Standard

Every API endpoint returns a consistent JSON envelope. There are two variants:

**Success (single object or action):**
```python
return Response(
    {
        "success": True,
        "message": "Sale created successfully.",
        "data": SaleSerializer(sale).data,
    },
    status=status.HTTP_201_CREATED,
)
```

**Success (read single object, no message needed):**
```python
return Response({"success": True, "data": SaleSerializer(sale).data})
```

**Success (action-only, no data payload):**
```python
return Response({"success": True, "message": "Category deactivated."})
```

**Success (paginated list):** Handled by `StandardPagination` in `apps/core/pagination.py`. Returns:
```json
{
  "count": 100,
  "total_pages": 5,
  "current_page": 1,
  "next": "...",
  "previous": "...",
  "results": [...]
}
```
Note: paginated list responses do NOT wrap in `{"success": true}` — the paginator returns its own structure directly.

**Error (handled by custom exception handler in `apps/core/exceptions.py`):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message.",
    "details": {"field_name": ["Error message."]}
  }
}
```

**Rule:** Never return raw DRF errors. Always raise an exception class — the custom exception handler formats it automatically. `EXCEPTION_HANDLER` is configured globally in `config/settings/base.py`.

## Exception Handling Pattern

Business logic violations are raised as exceptions, never returned as error responses.

**Exception hierarchy** (`apps/core/exceptions.py`):
```
APIException
└── BusinessLogicError (HTTP 422) — base for all domain violations
    ├── InsufficientStockError (HTTP 422)
    ├── SubscriptionLimitError (HTTP 422)
    ├── InvalidOTPError (HTTP 400)
    │   └── OTPMaxAttemptsError (HTTP 400)
    ├── OTPExpiredError (HTTP 400)
    ├── OTPCooldownError (HTTP 429)
    ├── OTPDeliveryFailedError (HTTP 503)
    ├── BankakAccountRequiredError (HTTP 422)
    └── InvalidBankakAccountError (HTTP 400)
NotFound (HTTP 404)
```

**Usage in views:**
```python
raise BusinessLogicError("No active business found.")
raise BusinessLogicError("You can only create sales for your assigned shop.", code="SHOP_MISMATCH")
raise NotFound("Sale not found.")
raise InsufficientStockError()  # uses default_detail
```

**Usage in services:** Services raise exceptions directly — they do not return success/error dicts.

**Django built-in exception coercion:** The custom handler in `apps/core/exceptions.py` automatically converts `DjangoValidationError`, `Http404`, and `PermissionDenied` into DRF-compatible exceptions before formatting.

## Service Layer Conventions

Business logic lives exclusively in `services.py` modules. Views only: resolve the tenant, validate input via serializer, call the service, return `Response`.

**Service function signature pattern:**
```python
@transaction.atomic
def create_sale(
    tenant: Business,
    shop: Shop,
    cashier,
    items: list[dict],
    payment_method: str = PaymentMethod.CASH,
    ...
) -> Sale:
    """
    Docstring with Args/Returns/Raises sections.
    """
```

**Key conventions:**
- Services decorated with `@transaction.atomic` when they span multiple DB writes.
- `cancel_sale` in `apps/sales/services.py` uses `with transaction.atomic():` inside the function body (not decorator) — both styles exist.
- Services use `select_for_update()` on the primary model when concurrent writes are a risk (e.g., `process_refund` in `apps/sales/services.py`).
- Services call other app services by direct import (e.g., `deduct_stock`, `add_stock` from `apps/inventory/services.py`).
- Helper functions prefixed with `_` are private to the module (e.g., `_award_loyalty_points`, `_sync_one_sale`, `_fail`).
- Services log state changes with `logger.info(...)` using `%s`-style formatting (never f-strings in logger calls).

**Tenant resolution:** Views call `get_tenant_from_request(request)` from `apps/products/services.py` to resolve the authenticated user's business. This is the standard pattern — not inline ORM calls.

## Serializer Patterns

**Input vs. Output separation:** Input serializers inherit from `serializers.Serializer` (not ModelSerializer) and are named with `Input`, `Create`, or `Request` suffix. Output serializers inherit from `serializers.ModelSerializer` and have no suffix.

```python
# Input serializer — validates what comes IN
class CreateSaleSerializer(serializers.Serializer):
    shop = serializers.UUIDField()
    items = SaleItemInputSerializer(many=True, min_length=1)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.CASH)

# Output serializer — shapes what goes OUT
class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source="cashier.full_name", read_only=True)

    class Meta:
        model = Sale
        fields = [...]
        read_only_fields = ["id", "tenant", "receipt_number", ...]
```

**Pattern for read-only derived fields:** Add `serializers.CharField(source="related.field", read_only=True)` directly on the output serializer rather than via `SerializerMethodField` when it's a simple attribute traversal.

**Validation in input serializers:** Use `validate_<field_name>` methods for field-level validation. Raise `serializers.ValidationError(...)` — never raise `BusinessLogicError` inside a serializer.

**Calling pattern in views:**
```python
serializer = CreateSaleSerializer(data=request.data)
serializer.is_valid(raise_exception=True)
data = serializer.validated_data
# then call service with data
```

## Model Patterns

**Base classes** (`apps/core/models/base.py`):

```python
class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)

    objects = SoftDeleteManager()      # default: excludes soft-deleted
    all_objects = AllObjectsManager()  # includes soft-deleted

    class Meta:
        abstract = True
        ordering = ["-created_at"]

class TenantModel(BaseModel):
    tenant = models.ForeignKey("tenants.Business", ...)
    # used for all tenant-scoped resources
```

**All primary keys are UUIDs.** Never use integer PKs or `pk=` directly in user-facing responses — serialize as `str(instance.id)`.

**Soft delete:** Call `instance.soft_delete()` to soft-delete; never call `instance.delete()` from services unless a hard delete is explicitly intended. `objects` manager auto-filters `is_deleted=False`.

**Querying deleted records:** Use `Model.all_objects.filter(...)` for admin/audit access to deleted records.

**Saving partial updates:** Use `save(update_fields=[...])` for targeted field updates. Example:
```python
sale.status = SaleStatus.CANCELLED
sale.notes = updated_notes
sale.save(update_fields=["status", "notes", "updated_at"])
```

## Permissions

Custom permission classes live in `apps/core/permissions.py`:
- `IsAuthenticated` — DRF built-in, default for all views
- `IsOwner` — role == "owner"
- `IsManagerOrAbove` — role in ("manager", "owner")
- `IsCashierOrAbove` — role in ("cashier", "manager", "owner")
- `HasBusiness` — owner must have created a business
- `IsTenantMember` — user belongs to same tenant as object
- `IsVerified` — phone must be verified

Apply as `permission_classes = [IsAuthenticated, IsManagerOrAbove]` on the view class.

## Logging Conventions

Every module that performs side effects declares a module-level logger:
```python
import logging
logger = logging.getLogger(__name__)
```

**Log levels:**
- `logger.info(...)` — state changes (sale created, stock deducted, refund processed)
- `logger.debug(...)` — verbose operational details (loyalty points awarded)
- `logger.exception(...)` — unhandled errors (in the exception handler and offline sync)

**Format:** Always use `%s`-style placeholder formatting, never f-strings:
```python
# Correct
logger.info("Sale created: %s | tenant=%s | shop=%s | amount=%s", receipt, tenant.id, shop.id, net_amount)

# Wrong
logger.info(f"Sale created: {receipt}")
```

**Logging backend:** `structlog==24.4.0` is installed but module-level usage uses stdlib `logging.getLogger(__name__)`. No structured log field injection is used in service code currently.

## URL Naming Conventions

URL names use `snake_case` throughout. Convention: `<resource>_<action>`.

Examples from `apps/sales/urls.py`:
```python
path("",                      SaleListCreateView.as_view(),  name="sale_list_create"),
path("summary/",              SalesSummaryView.as_view(),    name="sale_summary"),
path("dashboard-summary/",    DashboardSummaryView.as_view(),name="dashboard_summary"),
path("offline-sync/",         OfflineSyncView.as_view(),     name="sale_offline_sync"),
path("<uuid:pk>/",            SaleDetailView.as_view(),      name="sale_detail"),
path("<uuid:pk>/cancel/",     SaleCancelView.as_view(),      name="sale_cancel"),
path("<uuid:pk>/refund/",     SaleRefundView.as_view(),      name="sale_refund"),
```

URL path segments use hyphens (`offline-sync`, `dashboard-summary`). URL names use underscores (`sale_offline_sync`, `dashboard_summary`).

All app URL namespaces are declared in the root `config/urls.py`:
```
api/v1/sales/      → namespace "sales"
api/v1/inventory/  → namespace "inventory"
api-public/v1/auth/ → namespace "auth_public"
```

## Import Style

**Order** (enforced by `isort`):
1. Standard library (`import logging`, `from decimal import Decimal`)
2. Third-party (`from django.db import models`, `from rest_framework import serializers`)
3. Local apps — absolute imports only (`from apps.core.exceptions import BusinessLogicError`)

**No relative imports.** All cross-app imports use full `apps.` prefix.

**Deferred imports:** Cross-app imports that would cause circular dependencies are placed inside function bodies:
```python
# In apps/sales/views.py
from apps.customers.models import Customer   # inside a method, not at module top

# In apps/sales/services.py  
from apps.accounts.services import get_default_bankak_account  # inside function
```

**Module-level grouping:** Within a module, imports are grouped with a blank line between each group. Related DRF imports are grouped together:
```python
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
```

## View Class Conventions

All views inherit from `rest_framework.views.APIView` — not `ModelViewSet` or generic views. Each view handles one or two HTTP methods explicitly.

**Pattern for object retrieval:**
```python
class SaleDetailView(APIView):
    def get_sale(self, pk):
        tenant = get_tenant_from_request(self.request)
        try:
            return Sale.objects.get(pk=pk, tenant=tenant)
        except Sale.DoesNotExist:
            raise NotFound("Sale not found.")

    def get(self, request, pk):
        sale = self.get_sale(pk)
        return Response({"success": True, "data": SaleSerializer(sale).data})
```

**Tenant guard:** Every view method that accesses tenant-scoped data begins with:
```python
tenant = get_tenant_from_request(request)
if not tenant:
    raise BusinessLogicError("No active business found.")
```

---

*Convention analysis: 2026-05-19*
