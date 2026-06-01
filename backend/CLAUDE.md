# AmanaPOS — Backend Claude Code Instructions

> Applies to everything inside `backend/`. Read the root `CLAUDE.md` first, then this file.

---

## Project Layout

```
backend/
├── apps/
│   ├── accounts/       # Users, OTP, JWT auth, Bankak account
│   ├── admin_panel/    # Super-admin endpoints (is_staff only)
│   ├── audit_logs/     # HTTP request audit middleware + model
│   ├── core/           # Shared base: models, exceptions, pagination, storage, image service
│   ├── customers/      # Customer records + loyalty points
│   ├── inventory/      # Stock levels, movements, batches, inbound receiving
│   ├── notifications/  # Push (FCM) + in-app notifications + device tokens
│   ├── offline/        # Bootstrap payload + asset manifest for mobile
│   ├── products/       # Product catalog + categories + image upload
│   ├── sales/          # Sale creation, offline sync, refunds, dashboard
│   ├── subscriptions/  # Plans, subscriptions, resource limit guards
│   └── tenants/        # Business + Shop management
└── config/
    ├── settings/
    │   ├── base.py       # All shared settings
    │   ├── local.py      # Dev overrides
    │   └── production.py
    ├── urls.py           # Root URL routing
    └── celery.py         # Celery app
```

---

## The Architecture Pattern — Memorise This

```
Request
  │
  ▼
View (apps/{app}/views.py)
  │  1. Authenticate (JWT — automatic via DRF)
  │  2. Validate HTTP input with serializer
  │  3. Resolve tenant via get_tenant_from_request()
  │  4. Call ONE service function
  │  5. Return response
  │
  ▼
Service (apps/{app}/services.py)
  │  @transaction.atomic
  │  Business rules, validation, model orchestration
  │  Calls other app services via deferred imports
  │
  ▼
Models (apps/{app}/models/)
  │  Data only — no business logic
  │
  ▼
Signals / Tasks (post_save signals → Celery tasks)
```

**If you are putting logic anywhere other than `services.py`, stop and reconsider.**

---

## Views — Rules

### All views are class-based APIView

```python
from rest_framework.views import APIView
from rest_framework.response import Response

class ProductListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        products = Product.objects.filter(tenant=tenant, is_deleted=False)
        serializer = ProductSerializer(products, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        tenant = get_tenant_from_request(request)
        serializer = CreateProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = create_product(tenant, serializer.validated_data)
        return Response({"success": True, "data": ProductSerializer(product).data}, status=201)
```

**Never:**

- Use `ModelViewSet`, `GenericAPIView`, or `Router`
- Put `Product.objects.create(...)` in a view method
- Raise `BusinessLogicError` or any domain exception from a view
- Skip the serializer for input validation
- Return raw model data without a serializer

### URL registration

```python
# apps/{app}/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.ProductListCreateView.as_view(), name="product-list-create"),
    path("<uuid:pk>/", views.ProductDetailView.as_view(), name="product-detail"),
]
```

Register in `config/urls.py` under the correct prefix. No `include()` with auto-routers.

---

## Services — Rules

### Every mutating service is atomic

```python
from django.db import transaction

@transaction.atomic
def create_product(tenant, data):
    # validate business rules
    check_product_limit(tenant)
    # do the work
    product = Product.objects.create(tenant=tenant, **data)
    return product
```

### Raise domain exceptions, never HTTP exceptions

```python
# CORRECT — from apps/core/exceptions.py
from apps.core.exceptions import BusinessLogicError, InsufficientStockError, NotFound

if stock.quantity < requested_qty:
    raise InsufficientStockError("Not enough stock for this product.")

# WRONG — never do this in a service
from rest_framework.exceptions import ValidationError
raise ValidationError("...")   # ← HTTP concern, belongs in views/serializers
```

### Cross-app service calls use deferred imports

```python
# To avoid circular imports, import inside the function body
@transaction.atomic
def create_sale(tenant, shop, cashier, items, ...):
    from apps.inventory.services import deduct_stock       # deferred
    from apps.notifications.services import notify_user    # deferred

    sale = Sale.objects.create(...)
    for item in items:
        deduct_stock(item.product, shop, item.quantity, ...)
    return sale
```

### Concurrent write safety — always use select_for_update

```python
@transaction.atomic
def process_refund(sale, items, notes, refunded_by):
    # Row-lock to prevent concurrent refunds on the same sale
    sale = Sale.objects.select_for_update().get(pk=sale.pk)
    stock_level = StockLevel.objects.select_for_update().get(
        product=item.product, shop=sale.shop
    )
    ...
```

Required for: refunds, stock deductions, any operation where a race condition would cause data corruption.

---

## Exception Types (apps/core/exceptions.py)

Use these — don't invent new HTTP exception classes.

| Exception                    | HTTP Status | Code                          |
| ---------------------------- | ----------- | ----------------------------- |
| `BusinessLogicError`         | 422         | base class for domain errors  |
| `InsufficientStockError`     | 422         | `INSUFFICIENT_STOCK`          |
| `SubscriptionLimitError`     | 422         | `SUBSCRIPTION_LIMIT_EXCEEDED` |
| `BankakAccountRequiredError` | 422         | `BANKAK_ACCOUNT_REQUIRED`     |
| `InvalidOTPError`            | 400         | `INVALID_OTP`                 |
| `OTPExpiredError`            | 400         | `OTP_EXPIRED`                 |
| `OTPCooldownError`           | 429         | carries `retry_after`         |
| `OTPDeliveryFailedError`     | 503         |                               |
| `NotFound`                   | 404         |                               |

All errors are returned in this shape (handled by `custom_exception_handler`):

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Not enough stock.",
    "details": {}
  }
}
```

---

## Permission Classes (apps/core/permissions.py)

Always combine with `IsAuthenticated`.

```python
class MyView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrAbove]
```

| Class              | Who passes                              |
| ------------------ | --------------------------------------- |
| `IsOwner`          | `role == "owner"`                       |
| `IsManagerOrAbove` | `role in ("manager", "owner")`          |
| `IsCashierOrAbove` | any authenticated role                  |
| `HasBusiness`      | owner who has created a Business        |
| `IsTenantMember`   | object's tenant matches user's business |
| `IsVerified`       | `user.is_verified == True`              |

Admin panel only:

```python
permission_classes = [IsAuthenticated, IsAdminUser]  # is_staff=True
```

---

## Models — Rules

### Inherit from the right base

```python
from apps.core.models import BaseModel, TenantModel

# For tenant-scoped resources (almost everything):
class Product(TenantModel):   # has: UUID PK, timestamps, soft-delete, tenant FK
    ...

# For non-tenant models (users, plans, etc.):
class CustomUser(AbstractBaseUser, BaseModel):
    ...
```

### Tenant FK is mandatory on all resource models

```python
class Product(TenantModel):
    # tenant FK is inherited from TenantModel — do not add it manually
    name = models.CharField(max_length=255)
    ...
```

### Restaurant vs Shop logic

Check `business_type` before any inventory operation:

```python
from apps.tenants.models import BusinessType

if tenant.business_type == BusinessType.RESTAURANT:
    # skip all stock operations — restaurants don't track inventory
    return

# proceed with stock deduction
deduct_stock(...)
```

This check is required in: `create_sale`, `process_refund`, `cancel_sale`, any inbound/transfer flow.

---

## Key Pre-Built Service Functions — Import, Don't Rewrite

### Sales (apps/sales/services.py)

```python
from apps.sales.services import create_sale, process_refund, cancel_sale

# create_sale handles: receipt number, stock deduction, Bankak snapshot,
#                      loyalty points, StockMovement records
sale = create_sale(tenant, shop, cashier, items, payment_method, ...)
```

### Inventory (apps/inventory/services.py)

```python
from apps.inventory.services import (
    add_stock,
    deduct_stock,
    adjust_stock,
    transfer_stock,
    inbound_receive,   # premium feature — creates InboundTransaction
)
```

### Tenant resolution (apps/products/services.py)

```python
from apps.products.services import get_tenant_from_request

tenant = get_tenant_from_request(request)
```

### Subscription guards (apps/subscriptions/guards.py)

```python
from apps.subscriptions.guards import (
    check_shop_limit,
    check_product_limit,
    check_user_limit,
    require_feature,
)

# Call these at the START of any service that creates a limited resource:
check_product_limit(tenant)   # raises SubscriptionLimitError (422) if over quota

# Gate premium features:
require_feature(tenant, "inventory_inbound_receiving")
```

### Notifications (apps/notifications/services/**init**.py)

```python
from apps.notifications.services import notify_user
from apps.notifications.notification_templates import render_notification

notify_user(
    user=owner,
    **render_notification("low_stock", product_name="Milk", shop_name="Main", ...),
    data={"product_id": str(product.id)},   # optional FCM data payload
)
```

### Image handling (apps/core/image_service.py)

```python
from apps.core.image_service import process_and_upload_image, build_image_url, delete_images

result = process_and_upload_image(file, business_id=tenant.id, entity_type="product", entity_id=product.id)
# result = {"image": "businesses/.../original.webp", "thumbnail": "businesses/.../thumbnail.webp"}
```

---

## Authentication & JWT

- OTP login (mobile): `POST /api-public/v1/auth/login/otp/` → verify → JWT pair
- Password login (admin dashboard): `POST /api-public/v1/auth/login/password/`
- Access token: 60 min | Refresh token: 30 days | Algorithm: HS256
- Rotation: refresh tokens are rotated + blacklisted on use
- OTPs stored in Redis, key: `otp:{phone}:{channel}`, TTL 300s, max 5 attempts

Public endpoints (no token): `/api-public/v1/...`
Private endpoints (JWT required): `/api/v1/...`

---

## Celery Tasks

### Queues

- `notifications` — all push/SMS delivery (`apps.notifications.tasks.*`)
- `default` — sales, inventory tasks

### Writing a new task

```python
from config.celery import app

@app.task(bind=True, max_retries=3, queue="notifications")
def send_something(self, user_id):
    try:
        ...
    except SomeTransientError as exc:
        raise self.retry(exc=exc, countdown=60)
```

### Existing beat schedule (don't duplicate these)

| Task                                                 | Schedule     |
| ---------------------------------------------------- | ------------ |
| `apps.accounts.tasks.cleanup_expired_otps`           | Every 1 hour |
| `apps.subscriptions.tasks.check_subscription_expiry` | Daily        |
| `apps.notifications.tasks.requeue_stuck_deliveries`  | Every 5 min  |
| `apps.inventory.tasks.check_expiry_alerts`           | Daily        |

---

## Offline Sync (apps/sales/views.py — OfflineSyncView)

- Mobile generates `client_sale_id` (UUID) before going offline
- On sync: check `Sale.objects.filter(tenant=tenant, client_sale_id=...).first()`
- If exists → return `{"status": "synced"}` — never create a duplicate
- Each sale in the batch is processed independently — one failure must NOT abort others
- Same `create_sale()` service is used; pass `client_sale_id=` and `synced_at=`

---

## Pagination & Filtering

```python
from apps.core.pagination import StandardPagination  # 20 items/page

class MyListView(APIView):
    def get(self, request):
        tenant = get_tenant_from_request(request)
        qs = MyModel.objects.filter(tenant=tenant)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(MySerializer(page, many=True).data)
```

Response shape:

```json
{"count": 150, "next": "...", "previous": null, "results": [...]}
```

---

## Response Shape Convention

All API responses follow this shape:

```python
# Success
return Response({"success": True, "data": serializer.data}, status=200)

# Created
return Response({"success": True, "data": serializer.data}, status=201)

# Errors — handled automatically by custom_exception_handler
# Never construct error responses manually in views
```

---

## Image Uploads

Endpoints that accept images must handle `multipart/form-data` with field `image_upload`.
Both JSON and multipart are accepted — image is optional.

```python
def post(self, request):
    image_file = request.FILES.get("image_upload")
    if image_file:
        image_data = process_and_upload_image(
            image_file, business_id=tenant.id, entity_type="product", entity_id=product.id
        )
        product.image = image_data["image"]
        product.thumbnail = image_data["thumbnail"]
        product.save()
```

---

## Settings You'll Need

From `backend/config/settings/base.py`:

```python
USE_S3               # True → MinIO, False → local media/
MINIO_PUBLIC_URL     # public base URL for image absolute URLs
MAX_IMAGE_UPLOAD_MB  # default 10
OTP_EXPIRY_SECONDS   # default 300
OTP_LENGTH           # default 6
SMS_PROVIDER         # "stub" (dev) or "twilio" (prod)
```

---

## Checklist Before Submitting Any Backend Change

- [ ] Tenant filter applied to every queryset?
- [ ] Business logic in `services.py`, not in the view?
- [ ] Mutating service wrapped in `@transaction.atomic`?
- [ ] `select_for_update()` used where concurrent access is possible?
- [ ] Raised a domain exception (not an HTTP exception) from service?
- [ ] Restaurant business type checked before any inventory operation?
- [ ] New model extends `BaseModel` or `TenantModel`?
- [ ] UUID primary key on new model?
- [ ] Migration created and committed?
- [ ] No ViewSets or Routers introduced?
- [ ] Subscription limit guard called before creating a limited resource?
