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

All notification strings are centralized in `apps/notifications/notification_templates.py`.
**Never hardcode titles or bodies in views, tasks, or signals.**

### Available Templates

| Key | Placeholders |
|-----|-------------|
| `welcome` | *(none)* |
| `new_device_login` | `{device_name}` |
| `low_stock` | `{product_name}`, `{shop_name}`, `{current_qty}`, `{min_qty}` |
| `subscription_expiry` | `{business_name}`, `{days_remaining}` |

### Usage

```python
from apps.notifications.notification_templates import render_notification

# No placeholders
payload = render_notification("welcome")

# With placeholders
payload = render_notification("new_device_login", device_name="iPhone 15 Pro Max")

# payload is a dict: {"title": "...", "body": "...", "notification_type": "..."}
# Unpack directly into notify_user():
notify_user(user, **payload)
```

---

## Adding a New Notification

1. Add an entry to `_TEMPLATES` in `apps/notifications/notification_templates.py`.
2. Add the `NotificationType` choice in `apps/notifications/models/notification.py` if the type is new.
3. Call `notify_user()` using the template:

```python
from apps.notifications.services import notify_user
from apps.notifications.notification_templates import render_notification

notify_user(
    user=owner,
    **render_notification("your_template_key", placeholder="value"),
    data={"extra_key": "value"},  # optional — extra data sent to the device
)
```

4. That's it — the function handles DB insertion, push delivery, and retries automatically.

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
