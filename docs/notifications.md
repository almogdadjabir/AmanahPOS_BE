# AmanaPOS — Notification System

All notification types, their payloads, and how each one is triggered.

---

## Architecture Overview

```
Business Event
    │
    ▼
notify_user()  ──────────────────────────────────┐
  apps/notifications/services/__init__.py         │
    │                                             │
    ├─ Creates Notification (in-app)              │
    ├─ Creates NotificationDelivery (PUSH)        │
    └─ transaction.on_commit → deliver_push_notification.delay()
                                                  │
                                          Celery Worker
                                                  │
                                          FirebaseService.send_to_user()
                                                  │
                                          FCM → Device
```

**Key properties:**
- `notify_user()` is the single entry point for all in-app + push notifications.
- Tasks are queued **after** the DB transaction commits (no orphan tasks on rollback).
- Retry schedule: 60 s → 300 s → 900 s, max 3 attempts.
- Invalid FCM tokens are automatically deactivated after a permanent failure response.

---

## Notification Types

| Code | Label |
|------|-------|
| `info` | Info |
| `success` | Success |
| `warning` | Warning |
| `error` | Error |
| `sale` | Sale |
| `stock` | Stock |
| `subscription` | Subscription |
| `security` | Security |
| `system` | System |

---

## 1. Welcome (First Login)

| Field | Value |
|-------|-------|
| **Type** | `success` |
| **Channel** | Push (Firebase) + in-app |
| **Title** | `Welcome to AmanaPOS!` |
| **Body** | `Your account is ready. Start managing your business from anywhere.` |

**Trigger:**
User completes OTP login via `POST /api/v1/auth/login/verify-otp/` **and** their `last_login_at` field was `null` before this login — meaning it's their very first login ever.

**Recipient:** The user who just logged in.

**Code path:**
```
POST /auth/login/verify-otp/
  → accounts/views.py  LoginOTPVerifyView
    checks: user.last_login_at IS NULL before login_with_otp()
  → login_with_otp() sets last_login_at
  → notify_user(user, **render_notification("welcome"))
  → notifications/tasks.py  deliver_push_notification.delay()
  → FirebaseService.send_to_user(user)
```

---

## 2. New Device Login

| Field | Value |
|-------|-------|
| **Type** | `warning` |
| **Channel** | Push (Firebase) + in-app |
| **Title** | `New device login` |
| **Body** | `Your account was just accessed from a new device: {device_name}. If this wasn't you, contact support immediately.` |

**Trigger:**
User logs in via OTP AND includes an `fcm_token` in the request that has **never been registered before** — meaning a fresh install or a new physical device.
Only fires on non-first logins (first login gets the Welcome notification instead).

**`device_name` resolution** (in priority order):
1. `device_name` field sent by the client (e.g. `"iPhone 15 Pro Max"`)
2. Platform name fallback: `"Android device"` / `"iOS device"` / `"web browser"`

**Client request fields (all optional, but needed for this notification):**
```json
{
  "phone": "...",
  "otp": "...",
  "fcm_token": "dWxf...",
  "platform": "ios",
  "device_name": "iPhone 15 Pro Max",
  "device_id": "...",
  "app_version": "1.0.0"
}
```

**Code path:**
```
POST /auth/login/verify-otp/
  → accounts/views.py  LoginOTPVerifyView
    checks: DeviceToken with this fcm_token NOT in DB before update_or_create()
  → DeviceToken.objects.update_or_create(token=fcm_token, ...)  → created=True
  → notify_user(user, **render_notification("new_device_login", device_name=...))
  → notifications/tasks.py  deliver_push_notification.delay()
  → FirebaseService.send_to_user(user)
```

---

## 3. Low Stock Alert

| Field | Value |
|-------|-------|
| **Type** | `stock` |
| **Channel** | Push (Firebase) |
| **Title** | `Low Stock Alert` |
| **Body** | `'{product.name}' at {shop.name} is running low. Stock: {current_qty} (min: {min_qty})` |
| **Extra data** | `product_id`, `shop_id`, `current_qty`, `min_qty` |

**Trigger:**
A `StockMovement` record is saved → `post_save` signal in `apps/inventory/signals.py` recalculates the `StockLevel`.
If the new quantity is at or below the product's minimum threshold (`StockLevel.is_low_stock == True`) and `product.track_inventory == True`, the signal calls `send_low_stock_notification.delay()`.

**Recipient:** The owner of the business that owns the shop.

**Code path:**
```
StockMovement.save()
  → inventory/signals.py  @receiver(post_save, sender=StockMovement)
  → notifications/tasks.py  send_low_stock_notification.delay(stock_level_id)
  → notifications/tasks.py  send_push_notification.delay(...)
  → notifications/services/__init__.py  notify_user()
  → notifications/tasks.py  deliver_push_notification.delay(delivery_id)
  → FirebaseService.send_to_user(owner)
```

---

## 4. Subscription Expiry Warning

| Field | Value |
|-------|-------|
| **Type** | `subscription` |
| **Channel** | Push (Firebase) |
| **Title** | `Subscription Expiring Soon` |
| **Body** | `Your {business.name} subscription expires in {days_remaining} day(s). Renew now to avoid interruption.` |
| **Extra data** | `business_id`, `days_remaining` |

**Trigger:**
Celery Beat runs `check_subscription_expiry` once per day (every 86 400 s).
The task finds all active subscriptions whose `end_date` falls within the next 7 days and calls `send_subscription_expiry_warning.delay()` for each one.

**Recipient:** The owner of the expiring subscription's business.

**Code path:**
```
Celery Beat (daily)
  → subscriptions/tasks.py  check_subscription_expiry()
  → notifications/tasks.py  send_subscription_expiry_warning.delay(subscription_id, days_remaining)
  → notifications/services/__init__.py  notify_user()
  → notifications/tasks.py  deliver_push_notification.delay(delivery_id)
  → FirebaseService.send_to_user(owner)
```

---

## 5. Subscription Expiry SMS

| Field | Value |
|-------|-------|
| **Channel** | SMS (Twilio / BudgetSMS) |
| **Message** | `Your AmanaPOS subscription '{plan.name}' expires in 7 days on {end_date}. Renew now to avoid service interruption.` |

**Trigger:**
Same daily `check_subscription_expiry` task — alongside the push notification, it also dispatches `send_sms_task.delay()` to send an SMS to the business owner's phone number.

**Code path:**
```
Celery Beat (daily)
  → subscriptions/tasks.py  check_subscription_expiry()
  → notifications/tasks.py  send_sms_task.delay(phone, message)
  → SMS provider (Twilio or BudgetSMS, based on SMS_PROVIDER setting)
```

---

## 6. OTP SMS (Login / Registration)

| Field | Value |
|-------|-------|
| **Channel** | SMS (Twilio / BudgetSMS) |
| **Message** | `Your AmanaPOS OTP is: {otp}` (6-digit code) |

**Trigger:**
User calls one of these API endpoints:
- `POST /api/v1/auth/request-otp/` — login OTP request
- `POST /api/v1/auth/resend-otp/` — resend OTP
- `POST /api/v1/auth/register/` (admin creates owner — OTP sent separately)

**Code path:**
```
API request
  → accounts/views.py  LoginOTPRequestView / ResendOTPView
  → accounts/services.py  send_otp(phone)
  → core/utils.py  send_sms_otp(phone, otp)
  → SMS provider (synchronous, not queued via Celery)
```

> **Note:** OTP SMS is synchronous and not stored in the `Notification` or `NotificationDelivery` tables.

---

## Delivery Infrastructure

### Celery Tasks

| Task | Queue | Triggered by | Purpose |
|------|-------|--------------|---------|
| `deliver_push_notification` | `notifications` | `notify_user()` on_commit | Send a single push delivery via Firebase |
| `send_push_notification` | `notifications` | Low stock / subscription tasks | Wrapper that calls `notify_user()` |
| `send_low_stock_notification` | `notifications` | `StockMovement` post_save signal | Build & dispatch low-stock push |
| `send_subscription_expiry_warning` | `notifications` | Daily Celery Beat | Build & dispatch expiry push |
| `send_sms_task` | `notifications` | Daily Celery Beat | Send subscription SMS |

### Celery Beat Schedule

| Task | Interval | Purpose |
|------|----------|---------|
| `apps.subscriptions.tasks.check_subscription_expiry` | Every 24 h | Send expiry push + SMS |
| `apps.accounts.tasks.cleanup_expired_otps` | Every 1 h | Remove expired OTP keys from Redis |
| `apps.notifications.tasks.requeue_stuck_deliveries` | Every 5 min | Rescue stuck PROCESSING and orphaned PENDING deliveries |

### Delivery Retry & Failure Recovery

**Normal retry path** (Firebase returns a failure response):

```
1st failure → retry in 60 s   (retry_count=1, next_retry_at=now+60s)
2nd failure → retry in 300 s  (retry_count=2, next_retry_at=now+300s)
3rd failure → retry in 900 s  (retry_count=3, next_retry_at=now+900s)
4th failure → status=FAILED   (permanent)
```

**Reaper recovery path** (worker crash / Redis message loss):

`requeue_stuck_deliveries` runs every 5 minutes and handles two failure modes:

| Mode | Detection | Action |
|------|-----------|--------|
| **Stuck PROCESSING** | `status=PROCESSING` and `updated_at < now − 10 min` | Reset to `PENDING`, clear `next_retry_at`, re-queue |
| **Orphaned PENDING** | `status=PENDING` and (`next_retry_at ≤ now` or `created_at < now − 5 min` with no `next_retry_at`) | Re-queue |

Double-queuing is safe — `select_for_update(nowait=True)` in `deliver_push_notification` ensures only one worker processes a delivery at a time; concurrent duplicate tasks silently skip.

**`next_retry_at` field** — set on every scheduled retry so the reaper knows when a PENDING delivery is actually ready vs still waiting for its backoff window.

### FCM Device Token Lifecycle

| Event | Effect |
|-------|--------|
| Login (`POST /auth/login/verify-otp/`) with `fcm_token` + `platform` | `DeviceToken` created or updated (`update_or_create`) |
| `POST /api/v1/notifications/devices/register/` | Same — explicit register/refresh |
| `POST /api/v1/notifications/devices/unregister/` | Token marked `is_active=False` |
| Push fails with `UNREGISTERED` / `INVALID_ARGUMENT` FCM error | Token auto-deactivated by `deliver_push_notification` task |

---

## API Endpoints (Mobile / Frontend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/notifications/` | Paginated notification history for current user |
| `GET` | `/api/v1/notifications/unread-count/` | Count of unread notifications |
| `PATCH` | `/api/v1/notifications/{id}/read/` | Mark single notification as read |
| `POST` | `/api/v1/notifications/mark-all-read/` | Mark all as read |
| `POST` | `/api/v1/notifications/devices/register/` | Register / refresh FCM token |
| `POST` | `/api/v1/notifications/devices/unregister/` | Deactivate FCM token on logout |
| `GET` | `/api/v1/notifications/devices/` | List own device tokens (debug) |

---

## Notification Template System

There are two kinds of templates:

- **Code templates** — defined in `apps/notifications/notification_templates.py`, used by Celery tasks and signals (welcome, low_stock, etc.)
- **DB templates** — created via the Admin UI or `POST /api/v1/admin/notifications/templates/`, used when manually sending from the dashboard

Both support Python `.format()`-style variable substitution: write `{variable_name}` anywhere in the title or body.

### Code Templates (`notification_templates.py`)

| Key | Placeholders |
|-----|-------------|
| `welcome` | *(none)* |
| `new_device_login` | `{device_name}` |
| `low_stock` | `{product_name}`, `{shop_name}`, `{current_qty}`, `{min_qty}` |
| `subscription_expiry` | `{business_name}`, `{days_remaining}` |

```python
from apps.notifications.notification_templates import render_notification

payload = render_notification("new_device_login", device_name="iPhone 15 Pro Max")
# {"title": "New device login", "body": "...iPhone 15 Pro Max...", "notification_type": "warning"}

notify_user(user, **payload)
```

### DB Templates (Admin UI / API)

Create a template with:

| Field | Example |
|-------|---------|
| `title_en` | `Hello {owner_name}!` |
| `body_en` | `Your subscription for {business_name} expires in {days} days.` |
| `variables` | `["owner_name", "business_name", "days"]` |

> **`variables`** is a JSON array of the placeholder names declared in the title/body.  
> The admin UI reads this list and shows an input field for each one when you choose to send the template.

#### Variable format rules

- Use Python `.format()` syntax: `{variable_name}` (curly braces, no spaces)
- Variable names must match exactly between the `variables` list and the placeholders in the text
- Names are case-sensitive: `{Owner_Name}` ≠ `{owner_name}`

#### Sending a DB template via API

```json
POST /api/v1/admin/notifications/send/push/
{
  "user_id": "uuid",
  "template_id": "uuid",
  "variables": {
    "owner_name": "Ahmad",
    "business_name": "Al Noor Café",
    "days": "3"
  }
}
```

All variable values must be strings. If a required placeholder is missing the API returns `400 Missing template variable: 'variable_name'`.

---

## Adding a New Notification

### Option A — Code-driven (for automated events)

1. Add an entry to `_TEMPLATES` in `apps/notifications/notification_templates.py`.
2. Add the `NotificationType` choice in `apps/notifications/models/notification.py` if the type is new.
3. Call `notify_user()` from your task/signal:

```python
from apps.notifications.services import notify_user
from apps.notifications.notification_templates import render_notification

notify_user(
    user=owner,
    **render_notification("your_template_key", placeholder="value"),
    data={"extra_key": "value"},  # optional FCM data payload
)
```

### Option B — DB template (for admin manual sends)

1. Open the Admin dashboard → Notifications → Templates → New.
2. Fill in `title_en`, `body_en`, (optionally `title_ar`, `body_ar`).
3. In the **Variables** field, list every placeholder name used in the text, e.g. `owner_name, business_name`.
4. Save and enable the template.
5. When sending from the dashboard, the form will show an input field for each declared variable — fill them in and send.

---

## Admin Management API

All endpoints require `is_staff=True`. Base path: `/api/v1/admin/notifications/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/templates/` | List templates (search, category, channel, enabled filters) |
| `POST` | `/templates/` | Create template |
| `GET` | `/templates/{id}/` | Get template |
| `PATCH` | `/templates/{id}/` | Update template |
| `DELETE` | `/templates/{id}/` | Delete template |
| `POST` | `/templates/{id}/toggle/` | Toggle enabled/disabled |
| `GET` | `/settings/` | Get all settings |
| `PATCH` | `/settings/` | Bulk update settings |
| `POST` | `/send/push/` | Manual push to a user |
| `POST` | `/send/sms/` | Manual SMS to a user |
| `GET` | `/logs/` | Delivery logs (channel, status, date, search filters) |

### Settings Keys

| Key | Default | Description |
|-----|---------|-------------|
| `push_enabled` | `"true"` | Enable/disable all push notifications globally |
| `sms_enabled` | `"true"` | Enable/disable all SMS notifications globally |
| `push_daily_limit` | `"1000"` | Max push notifications per day |
| `sms_daily_limit` | `"500"` | Max SMS messages per day |

---

## Product Expiry Alerts

Shop-only feature. Skipped entirely for `business_type=restaurant`.

### Settings

| Key | Default | Description |
|-----|---------|-------------|
| `expiry_alert_enabled` | `"true"` | Send push for batches expiring within the warning window |
| `expiry_warning_days` | `"7"` | Days before expiry that triggers the "expiring soon" alert |
| `expired_alert_enabled` | `"true"` | Send push for batches that have already expired |

Managed via `GET/PATCH /api/v1/admin/notifications/settings/`.

### Notification Templates

| Template key | Type | Placeholders |
|---|---|---|
| `product_expiring_soon` | `warning` | `{product_name}`, `{shop_name}`, `{expiry_date}` |
| `product_expired` | `error` | `{product_name}`, `{shop_name}`, `{expiry_date}` |

### Celery Task

`apps.inventory.tasks.check_expiry_alerts` — runs daily on the `notifications` queue.

**Logic:**
1. Read settings: `expiry_alert_enabled`, `expired_alert_enabled`, `expiry_warning_days`
2. Query all `ProductBatch` records where `expiry_date ≤ today + warning_days` AND `shop.business.business_type = SHOP` AND `last_notified_date ≠ today`
3. For each: send `product_expired` (error) or `product_expiring_soon` (warning) to the business owner via `notify_user()`
4. Set `batch.last_notified_date = today` to prevent same-day duplicates

### Mobile Integration Guide

| Method | Endpoint | When to call |
|--------|----------|-------------|
| `GET` | `/api/v1/offline/bootstrap/` | On login/refresh — includes `expiry_batches[]` for shop businesses |
| `GET` | `/api/v1/inventory/expiry-alerts/` | On demand (inventory screen) |
| `GET` | `/api/v1/inventory/batches/` | Batch list (paginated, filter by `?shop=` or `?product=`) |
| `POST` | `/api/v1/inventory/batches/` | When receiving new stock — record batch + expiry date |
| `PATCH` | `/api/v1/inventory/batches/<id>/` | Edit expiry date or quantity |
| `DELETE` | `/api/v1/inventory/batches/<id>/` | Remove a batch |

**Bootstrap `expiry_batches` key:**

```json
"expiry_batches": [
  {
    "id": "uuid",
    "product": "product-uuid",
    "product_name": "Milk 1L",
    "shop": "shop-uuid",
    "shop_name": "Main Branch",
    "quantity": "50.000",
    "expiry_date": "2026-05-19",
    "batch_number": "BATCH-001",
    "is_expired": false,
    "updated_at": "2026-05-12T10:00:00Z"
  }
]
```

Empty array `[]` for restaurant businesses.

**Expiry alerts response (`GET /api/v1/inventory/expiry-alerts/`):**

```json
{
  "success": true,
  "data": {
    "expiring_soon": [
      {
        "id": "uuid",
        "product_name": "Milk 1L",
        "shop_name": "Main Branch",
        "business_name": "My Shop",
        "quantity": "50.000",
        "expiry_date": "2026-05-17",
        "batch_number": "BATCH-001",
        "is_expired": false
      }
    ],
    "expired": [...]
  }
}
```

**Create batch when receiving stock:**

```json
POST /api/v1/inventory/batches/
Headers: Authorization: Bearer <token>, X-Tenant-ID: <business_id>

{
  "product": "product-uuid",
  "shop": "shop-uuid",
  "quantity": "50.000",
  "expiry_date": "2026-06-15",
  "batch_number": "BATCH-001",
  "notes": "Received from supplier X"
}
```

**How to show alerts in app:**
1. On login: check `expiry_batches` from bootstrap — count `is_expired=true` and those within 7 days for a badge/alert
2. On inventory screen: call `GET /api/v1/inventory/expiry-alerts/` for a live refreshable list
3. Push notifications: the daily Celery task sends push via FCM — use existing notification handlers
4. Unread count: expiry notifications appear in `GET /api/v1/notifications/unread-count/` like any other

**Guards:**
- Restaurant businesses: `POST /api/v1/inventory/batches/` returns `403`
- `expiry_batches` in bootstrap is `[]` for restaurants
- `/api/v1/inventory/expiry-alerts/` returns empty lists for restaurants
