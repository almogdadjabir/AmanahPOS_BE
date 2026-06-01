# AmanaPOS — Claude Code Root Instructions

> This file is read automatically every session. Follow everything here before writing a single line of code.

---

## What This Project Is

**AmanaPOS** is a multi-tenant, offline-capable Point-of-Sale SaaS for small/medium businesses in Sudan and the MENA region.

```
AmanaPOS/
├── backend/          # Django 5 REST API  → see backend/CLAUDE.md
├── admin/            # Next.js 15 admin dashboard  → see admin/CLAUDE.md
├── landing_page/     # Next.js 15 marketing site
└── docker/           # Nginx + entrypoint
```

---

## Stack at a Glance

| Layer          | Tech                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| Backend API    | Django 5.0.6 + DRF 3.15.2 + Python 3.12                                 |
| Admin UI       | Next.js 15.3.1 + React 19 + TypeScript + Tailwind                       |
| Landing page   | Next.js 15.3.1 + React 19 + TypeScript + Tailwind                       |
| Database       | PostgreSQL 16 (single `public` schema)                                  |
| Cache / broker | Redis 7 (DB0=cache+sessions+OTP, DB1=Celery broker, DB2=Celery results) |
| Task queue     | Celery 5.4 + django-celery-beat                                         |
| Object storage | MinIO (S3-compatible) — two buckets: public + private                   |
| Auth           | JWT via SimpleJWT + phone OTP (Redis-backed)                            |

---

## Repository-Wide Rules

### 1. Never guess — read the code first

Before adding anything, check if it already exists. Key service functions, permission classes, exception types, and utilities are all pre-built. Importing the right thing beats rewriting it.

### 2. Respect the layer boundaries

```
HTTP layer (views)  →  business logic (services)  →  data (models)
```

Each layer has one job. Never skip a layer or merge two.

### 3. Environment config lives in .env

No hardcoded secrets, URLs, or credentials anywhere in source code.

### 4. Docker is the dev environment

All services run in Docker. Use `make` targets — don't run Django/Node directly unless explicitly asked.

```bash
make up          # start everything
make migrate     # run migrations
make shell       # Django shell
make test        # full test suite
make logs-app    # tail Django logs
```

### 5. All models use UUIDs as primary keys

```python
id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
```

Never use integer PKs on new models.

### 6. Soft deletes, not hard deletes

All models extend `BaseModel` which has `is_deleted` / `deleted_at` and a `SoftDeleteManager`.
Never call `.delete()` directly on tenant data unless you are 100% certain a hard delete is intended and confirmed by the user.

### 7. Migrations are committed

After any model change: `python manage.py makemigrations <app_name>` and commit the result.

---

## Multi-Tenancy — The Most Critical Concept

Every resource belongs to a `Business` (the tenant). **Every queryset must be scoped to a tenant.** Cross-tenant data access is a critical security bug.

### Tenant hierarchy

```
CustomUser (owner)
  └── Business (tenant)   ← everything is scoped to this
        └── Shop (one or many)
              ├── Products
              ├── StockLevel
              └── Sales
```

### Tenant resolution — always use this pattern

```python
from apps.products.services import get_tenant_from_request

def post(self, request):
    tenant = get_tenant_from_request(request)
    # now filter everything by tenant
    products = Product.objects.filter(tenant=tenant, ...)
```

- **Owner users:** resolve via `X-Tenant-ID` request header → their `Business` record
- **Staff users (manager/cashier):** resolved from `request.user.business` FK automatically

### User roles

| Role      | Access                                                    |
| --------- | --------------------------------------------------------- |
| `owner`   | All their businesses; uses `X-Tenant-ID` header to switch |
| `manager` | Single business, full CRUD except user management         |
| `cashier` | Single shop, sale creation + dashboard only               |

---

## What NOT to Do (Ever)

| ❌ Wrong                                 | ✅ Right                                           |
| ---------------------------------------- | -------------------------------------------------- |
| `Product.objects.all()`                  | `Product.objects.filter(tenant=tenant)`            |
| `Sale.objects.create(...)` in a view     | Call `create_sale(...)` from `apps.sales.services` |
| `raise APIException(...)` from a service | Raise `BusinessLogicError` or a subclass           |
| New `ModelViewSet` or `DefaultRouter`    | Class-based `APIView` + explicit `path()`          |
| Integer primary keys on new models       | `UUIDField(primary_key=True, default=uuid.uuid4)`  |
| Business logic in serializers            | Business logic in `services.py` only               |
| Hardcoded tenant IDs or user IDs         | Always resolve from `request`                      |

---

## Key URLs

| Service         | Dev URL                                     |
| --------------- | ------------------------------------------- |
| API             | http://localhost:8080/api/v1/               |
| Swagger UI      | http://localhost:8080/api/docs/             |
| Django admin    | http://localhost:8080/admin/                |
| MinIO console   | http://localhost:9001                       |
| Admin dashboard | http://localhost:8080 (Nginx proxies :3001) |
| Landing page    | http://localhost:3000                       |
