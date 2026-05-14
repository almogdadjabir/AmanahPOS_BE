# POS Dashboard Summary API — Design Spec

**Goal:** Add `GET /api/v1/sales/dashboard-summary/` so the mobile POS screen can display real-time sales totals, shift summary, sparkline, and top sellers instead of hardcoded values. Includes offline support via FE-side SQLite caching + local sale merging.

**Architecture:** New `DashboardSummaryView` in `apps/sales/views.py` following all existing patterns. Two new fields on `Business` (`currency`, `timezone`). No new models. 5 targeted DB queries per request, with 60s Django cache keyed per scope.

**Tech Stack:** Django 5, DRF, `pytz` / `zoneinfo` for tz conversion, Django cache framework (Redis), existing `Sale` / `SaleItem` / `Product` models.

---

## 1. Data Model Changes

### `Business` model — 2 new fields

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `currency` | `CharField(max_length=10)` | `"SDG"` | ISO 4217 code |
| `timezone` | `CharField(max_length=60)` | `"Africa/Khartoum"` | IANA tz name |

Migration: `apps/tenants/migrations/XXXX_business_currency_timezone.py`

Both fields are exposed in `BootstrapBusinessSerializer` so the mobile app always has them.

---

## 2. API Contract

### Endpoint

```
GET /api/v1/sales/dashboard-summary/
```

Authentication: required (`IsAuthenticated`).

### Query Parameters

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| `shop_id` | UUID | `null` | Must belong to user's business; ignored for cashiers |
| `date` | `YYYY-MM-DD` | today in `business.timezone` | Cannot be in the future |
| `top_sellers_limit` | int | `5` | Clamped to max 20 |

`business_id` is inferred from the authenticated user — never a query param.  
`timezone` comes from `business.timezone` — not a query param.

### Scoping Rules

| Role | shop_id present | Scope |
|------|-----------------|-------|
| OWNER / MANAGER | no | Business-wide (all active shops) |
| OWNER / MANAGER | yes | That shop only |
| CASHIER | any | Always `cashier.default_shop` (param ignored) |

### Response Shape

```json
{
  "success": true,
  "server_time": "2026-05-14T10:00:00Z",
  "timezone": "Africa/Khartoum",
  "currency": "SDG",
  "scope": {
    "business_id": "uuid",
    "shop_id": "uuid|null",
    "shop_name": "Main Shop|null"
  },
  "today": {
    "date": "2026-05-14",
    "gross_sales_amount": 450000.0,
    "net_sales_amount": 450000.0,
    "sales_count": 12,
    "average_sale_amount": 37500.0,
    "refund_amount": 0.0,
    "refund_count": 0,
    "cash_amount": 300000.0,
    "bankak_amount": 150000.0
  },
  "shift": {
    "cashier_id": "uuid|null",
    "cashier_name": "Esam Mohammed|null",
    "shift_started_at": "2026-05-14T06:00:00Z|null",
    "gross_sales_amount": 170500.0,
    "sales_count": 4,
    "average_sale_amount": 42625.0
  },
  "sparkline": {
    "interval": "hour",
    "points": [
      { "label": "08:00", "amount": 0.0, "sales_count": 0 },
      { "label": "09:00", "amount": 45000.0, "sales_count": 2 }
    ]
  },
  "top_sellers": [
    {
      "product_id": "uuid",
      "name": "Capo Yogurt",
      "quantity_sold": 49,
      "gross_amount": 17500.0,
      "thumbnail_url": "https://..."
    }
  ],
  "sync": {
    "includes_pending_offline_sales": false,
    "last_calculated_at": "2026-05-14T10:00:00Z"
  }
}
```

**Rules:**
- All amount fields return `0.0`, never `null`.
- `shift` fields are `null` for OWNER/MANAGER (no shift concept).
- `shift.shift_started_at` = `Min("created_at")` of cashier's COMPLETED sales today; `null` if zero sales.
- `sparkline.points` covers `00:00` → current hour (today) or all 24 hours (past date), zero-filled.
- `sync.includes_pending_offline_sales` is always `false` — FE merges local pending sales client-side.

---

## 3. Computation Logic

### UTC Range Filtering (critical for index usage)

```python
import zoneinfo
from datetime import datetime, time

from datetime import timedelta
tz = zoneinfo.ZoneInfo(business.timezone)
local_start = datetime.combine(target_date, time.min).replace(tzinfo=tz)
start_utc   = local_start.astimezone(zoneinfo.ZoneInfo("UTC"))
end_utc     = start_utc + timedelta(days=1)   # exact 24h window, avoids time.max edge

base_qs = Sale.objects.filter(
    tenant=tenant,
    status=SaleStatus.COMPLETED,
    created_at__gte=start_utc,
    created_at__lt=end_utc,
)
```

`created_at__date` is NOT used — it prevents index use on `created_at`.

### 5 Targeted Queries

1. **Today aggregate** — `base_qs.aggregate(Sum, Count)` with conditional sums for payment methods
2. **Refund aggregate** — same date/shop filter but `status__in=[REFUNDED, PARTIAL_REFUND]`
3. **Shift aggregate** — `base_qs.filter(cashier=user).aggregate(Min, Sum, Count)` (cashier only)
4. **Sparkline** — `base_qs.annotate(hour=TruncHour("created_at")).values("hour").annotate(amount=Sum, count=Count)` then zero-fill in Python
5. **Top sellers** — `SaleItem.objects.filter(sale__in=base_qs).values("product_id").annotate(qty=Sum, amount=Sum).order_by("-qty")[:limit]` + `select_related("product")`

### Amount Definitions

- `gross_sales_amount` = `Sum("total_amount")` on COMPLETED sales
- `net_sales_amount` = `gross_sales_amount - refund_amount`
- `refund_amount` = `Sum("total_amount")` on REFUNDED/PARTIAL_REFUND sales (same date/shop scope)
- `cash_amount` = `Sum("total_amount", filter=Q(payment_method="cash"))`
- `bankak_amount` = `Sum("total_amount", filter=Q(payment_method="bankak"))`

All `None` results from ORM aggregates are coerced to `0.0` in Python before serialization.

---

## 4. Caching

**Backend:** Django cache framework (Redis already configured).

**Cache key:**
```python
f"dashboard_summary:{tenant.id}:{shop_id or 'all'}:{target_date}:{user.role}:{user.id if cashier else 'any'}"
```

**TTL:** 60 seconds.

**Invalidation:** None for MVP — 60s TTL is sufficient. After a successful offline sync or checkout, FE can wait up to 60s or pull-to-refresh to force re-fetch. Cache auto-expires.

**Long-term note:** At scale, replace raw Sale queries with pre-computed daily/hourly rollup tables (`sales_daily_summary`, `sales_hourly_summary`, `product_sales_daily_summary`) updated transactionally or via Celery on each checkout/sync. The endpoint shape and cache layer remain unchanged — only the query source changes.

---

## 5. DB Indexes Required

Check existing indexes in `apps/sales/migrations/` before adding. Add only what's missing:

| Index | Purpose |
|-------|---------|
| `Sale(tenant, status, created_at)` | Main today aggregate |
| `Sale(tenant, shop, status, created_at)` | Shop-scoped aggregate |
| `Sale(tenant, cashier, status, created_at)` | Shift aggregate |
| `SaleItem(sale_id)` | Already likely exists (FK) |
| `SaleItem(product_id)` | Already likely exists (FK) |

---

## 6. Error Handling

| Condition | Response |
|-----------|----------|
| `shop_id` not found or belongs to another business | `404` |
| Cashier has no `default_shop` | `400 "Cashier has no assigned shop"` |
| Invalid `date` format | `400 "date must be YYYY-MM-DD"` |
| `date` in the future | `400 "date cannot be in the future"` |
| `top_sellers_limit` > 20 | Clamped to 20 silently |
| Unauthenticated | `401` (standard DRF) |
| No active business | `400 "No active business found"` |

---

## 7. Offline Support

The endpoint itself is online-only. Offline support is handled entirely on the mobile FE:

1. On successful API response → store full JSON in SQLite as `cached_dashboard_summary`
2. While offline → display cached summary + merge with unsynced `pending_sales` from local DB
3. After offline sales sync → refresh from BE (replaces cached snapshot)

`sync.includes_pending_offline_sales` is always `false` from BE — it's a signal to FE that local merge is needed. Once offline sales sync and are committed to the DB, they appear in the next BE response naturally.

---

## 8. Files Changed

| Action | File |
|--------|------|
| Modify | `apps/tenants/models/business.py` — add `currency`, `timezone` |
| Create | `apps/tenants/migrations/XXXX_business_currency_timezone.py` |
| Modify | `apps/offline/serializers.py` — add fields to `BootstrapBusinessSerializer` |
| Modify | `apps/sales/views.py` — add `DashboardSummaryView` |
| Modify | `apps/sales/urls.py` — register route |
| Create | `apps/sales/tests/test_dashboard_summary.py` — 14 test cases |
| Check/Modify | `apps/sales/migrations/` — add missing indexes if needed |

---

## 9. Test Cases

1. Owner, no `shop_id` → business-wide aggregate
2. Owner with `shop_id` → scoped to that shop
3. Cashier → forced to `default_shop`, shift block populated
4. Cashier with no `default_shop` → `400`
5. UTC boundary — sale at 23:59 local is in "today", 00:01 next day is not
6. Sparkline zero-fill — all hours present even with no sales
7. Refunds excluded from `gross_sales_amount`, counted in `refund_amount`/`refund_count`
8. CANCELLED/PENDING sales excluded entirely
9. `top_sellers_limit=50` → clamped to 20
10. All amounts are `0.0` (not `null`) when no sales exist
11. Cache hit — second request within TTL, no extra DB queries
12. Invalid `date` format → `400`
13. Future `date` → `400`
14. `shop_id` from another business → `404`
