# AmanaPOS — Notification System Audit

**Date:** 2026-05-31
**Status:** Partially complete — push delivery is production-ready, but Arabic support and two channels are not wired up.

---

## How It Works (The Flow)

```
Business event (login, low stock, expiry, admin broadcast)
        │
        ▼
notify_user(user, title, body, type, data)          ← services/__init__.py
        │
        ├─ 1. INSERT Notification row                ← in-app record (immediate)
        │
        ├─ 2. INSERT NotificationDelivery row        ← outbox, status=PENDING
        │
        └─ 3. transaction.on_commit → deliver_push_notification.delay(delivery_id)
                        │
                        ▼
                Celery worker picks up task  (queue: "notifications")
                        │
                        ├─ SELECT ... FOR UPDATE NOWAIT  ← prevents duplicate sends
                        ├─ status → PROCESSING
                        ├─ FirebaseService.send_to_user()
                        │       └─ sends to ALL active FCM tokens for the user
                        │
                        ├─ SUCCESS → status = SENT, provider_message_id saved
                        └─ FAILURE → retry with back-off (1 min → 5 min → 15 min, max 3)
                                      └─ permanent FAILED after 3 retries
```

**Reaper task** (`requeue_stuck_deliveries`) runs every 5 minutes and fixes two failure modes:
- Deliveries stuck in `PROCESSING` for >10 min (worker died mid-task)
- Orphaned `PENDING` deliveries whose Celery message was lost (broker restart)

---

## Models

| Model | Table | Purpose |
|---|---|---|
| `Notification` | `notifications_notifications` | In-app notification record per user |
| `NotificationDelivery` | `notifications_deliveries` | Outbox row tracking one delivery attempt |
| `DeviceToken` | `notifications_device_tokens` | FCM token per device per user |
| `NotificationTemplate` | `notifications_templates` | DB-stored bilingual templates (EN + AR) — **exists but not wired** |
| `NotificationSetting` | `notifications_settings` | Global on/off toggles and limits |

---

## Notification Types (9)

These are the `notification_type` values stored on every `Notification` row.

| Type | Value | When used |
|---|---|---|
| Info | `info` | Generic / default fallback |
| Success | `success` | Welcome message, account created |
| Warning | `warning` | New device login, product expiring soon |
| Error | `error` | Product expired |
| Sale | `sale` | **Reserved — never fired by any system event** |
| Stock | `stock` | Low stock alert |
| Subscription | `subscription` | Subscription expiring soon |
| Security | `security` | **Reserved — never fired by any system event** |
| System | `system` | Admin broadcasts |

---

## Delivery Channels

| Channel | Status | Notes |
|---|---|---|
| **Push (FCM)** | ✅ Production-ready | Firebase Admin SDK, multi-device, retry logic, auto token deactivation |
| **SMS** | ⚠️ Partial | `send_sms_task` exists, Twilio + BudgetSMS wired — **used for OTP only, never for notifications** |
| **Email** | ❌ Not implemented | `DeliveryChannel.EMAIL` exists in model, zero code behind it |

---

## System Notification Templates (hardcoded in `notification_templates.py`)

Business code calls `render_notification(key, **kwargs)` to get a formatted `{title, body, notification_type}` dict.

| Key | Type | Variables | Fired by |
|---|---|---|---|
| `welcome` | `success` | _(none)_ | First-ever OTP login |
| `new_device_login` | `warning` | `{device_name}` | Login from a new device |
| `low_stock` | `stock` | `{product_name}`, `{shop_name}`, `{current_qty}`, `{min_qty}` | StockLevel signal on save |
| `product_expiring_soon` | `warning` | `{product_name}`, `{shop_name}`, `{expiry_date}` | Daily Celery beat (`check_expiry_alerts`) |
| `product_expired` | `error` | `{product_name}`, `{shop_name}`, `{expiry_date}` | Daily Celery beat (`check_expiry_alerts`) |

> **Gap:** Subscription expiry warning in `subscriptions/tasks.py` is a hardcoded English string — it does NOT call `render_notification()` and will be missed when Arabic support is added.

---

## Global Settings (DB-controllable via `NotificationSetting`)

| Key | Default | Description |
|---|---|---|
| `push_enabled` | `true` | Master switch for all push notifications |
| `sms_enabled` | `true` | Master switch for all SMS |
| `push_daily_limit` | `1000` | Max push sends per day |
| `sms_daily_limit` | `500` | Max SMS per day |
| `expiry_alert_enabled` | `true` | Send push for expiring batches (shop type only) |
| `expiry_warning_days` | `7` | Days before expiry to trigger the alert |
| `expired_alert_enabled` | `true` | Send push for already-expired batches |

---

## What Is Working ✅

- Full push delivery pipeline: Notification row → Delivery row → Celery → Firebase
- Retry with exponential back-off (1 min, 5 min, 15 min), max 3 attempts
- Row-level locking (`SELECT FOR UPDATE NOWAIT`) prevents duplicate sends across workers
- Reaper task automatically recovers stuck/orphaned deliveries every 5 min
- Invalid FCM tokens are automatically deactivated after permanent failure
- Admin broadcast: super-admins can send custom notifications to any user from the admin panel
- Device token lifecycle: register on login, deactivate on logout
- In-app notification list, unread count, mark read (single + all)
- 5 system event templates firing correctly

---

## What Is Missing / Broken ❌

### 1. No Arabic support in templates — CRITICAL

The `NotificationTemplate` DB model was built with `title_en`, `body_en`, `title_ar`, `body_ar` and a `.render(locale)` method — but `notify_user()` and `render_notification()` never use it. Every notification goes out in English regardless of the user's language. The `_TEMPLATES` dict is English-only.

### 2. Subscription expiry not using the template system

`subscriptions/tasks.py` uses a hardcoded English string instead of calling `render_notification("subscription_expiry", ...)`. It will not pick up Arabic translations when the system is updated.

### 3. SMS channel not used for notifications

`send_sms_task` exists and both Twilio and BudgetSMS are wired, but only OTP uses SMS. No notification event sends an SMS.

### 4. Email channel not implemented

`DeliveryChannel.EMAIL` is defined but has zero implementation — no service, no templates, no dispatch logic.

### 5. `sale` and `security` notification types are orphaned

Both types exist in the model but are never fired by any system event. Reserved for future use.

---

## Template Migration Plan — Adding Arabic/English Support

The `NotificationTemplate` model already supports bilingual content and is ready to use.

### Step 1: Seed the 6 templates into the DB

Run as a migration or management command:

```python
TEMPLATES_TO_SEED = [
    {
        "key": "welcome",
        "name": "Welcome",
        "category": "success",
        "channel": "push",
        "title_en": "Welcome to AmanaPOS!",
        "body_en": "Your account is ready. Start managing your business from anywhere.",
        "title_ar": "مرحبًا بك في أمانة POS!",
        "body_ar": "حسابك جاهز. ابدأ إدارة عملك من أي مكان.",
        "variables": [],
    },
    {
        "key": "new_device_login",
        "name": "New Device Login",
        "category": "warning",
        "channel": "push",
        "title_en": "New device login",
        "body_en": "Your account was just accessed from a new device: {device_name}. If this wasn't you, contact support immediately.",
        "title_ar": "تسجيل دخول من جهاز جديد",
        "body_ar": "تم الوصول إلى حسابك من جهاز جديد: {device_name}. إذا لم تكن أنت، تواصل مع الدعم فورًا.",
        "variables": ["device_name"],
    },
    {
        "key": "low_stock",
        "name": "Low Stock Alert",
        "category": "stock",
        "channel": "push",
        "title_en": "Low Stock Alert",
        "body_en": "'{product_name}' at {shop_name} is running low. Stock: {current_qty} (min: {min_qty})",
        "title_ar": "تنبيه: مخزون منخفض",
        "body_ar": "'{product_name}' في {shop_name} وصل إلى مستوى منخفض. الكمية: {current_qty} (الحد الأدنى: {min_qty})",
        "variables": ["product_name", "shop_name", "current_qty", "min_qty"],
    },
    {
        "key": "product_expiring_soon",
        "name": "Product Expiring Soon",
        "category": "warning",
        "channel": "push",
        "title_en": "Product Expiring Soon",
        "body_en": "'{product_name}' at {shop_name} will expire on {expiry_date}. Check your inventory to avoid waste.",
        "title_ar": "منتج يقترب من انتهاء صلاحيته",
        "body_ar": "'{product_name}' في {shop_name} ينتهي في {expiry_date}. راجع مخزونك لتجنب الهدر.",
        "variables": ["product_name", "shop_name", "expiry_date"],
    },
    {
        "key": "product_expired",
        "name": "Product Expired",
        "category": "error",
        "channel": "push",
        "title_en": "Product Expired",
        "body_en": "'{product_name}' at {shop_name} expired on {expiry_date}. Remove it from stock immediately.",
        "title_ar": "منتج منتهي الصلاحية",
        "body_ar": "'{product_name}' في {shop_name} انتهت صلاحيته في {expiry_date}. أزله من المخزون فورًا.",
        "variables": ["product_name", "shop_name", "expiry_date"],
    },
    {
        "key": "subscription_expiry",
        "name": "Subscription Expiring Soon",
        "category": "subscription",
        "channel": "push",
        "title_en": "Subscription Expiring Soon",
        "body_en": "Your {business_name} subscription expires in {days_remaining} day(s). Renew now to avoid interruption.",
        "title_ar": "اشتراكك ينتهي قريبًا",
        "body_ar": "اشتراك {business_name} ينتهي خلال {days_remaining} يوم. جدّد الآن لتجنب الانقطاع.",
        "variables": ["business_name", "days_remaining"],
    },
]
```

### Step 2: Update `render_notification()` to look up DB templates first

```python
def render_notification(key: str, locale: str = "en", **kwargs) -> dict:
    """
    Try DB template first (supports Arabic), fall back to hardcoded dict.
    """
    try:
        from apps.notifications.models import NotificationTemplate
        tmpl = NotificationTemplate.objects.get(key=key, is_enabled=True)
        return tmpl.render(locale=locale, **kwargs)
    except Exception:
        pass

    # Fall back to hardcoded dict (English only — legacy)
    if key not in _TEMPLATES:
        raise KeyError(f"Unknown notification template {key!r}")
    tmpl = _TEMPLATES[key].copy()
    if kwargs:
        tmpl["title"] = tmpl["title"].format(**kwargs)
        tmpl["body"]  = tmpl["body"].format(**kwargs)
    return tmpl
```

### Step 3: Pass `locale` to callers

Add a `language` field to `CustomUser` (default `"en"`), then:

```python
# accounts/views.py
locale = getattr(user, "language", "en") or "en"
notify_user(user, **render_notification("welcome", locale=locale))
```

### Step 4: Fix subscription task

Replace the hardcoded string in `subscriptions/tasks.py` with:

```python
from apps.notifications.notification_templates import render_notification
locale = getattr(owner, "language", "en") or "en"
payload = render_notification("subscription_expiry", locale=locale,
                              business_name=sub.business.name,
                              days_remaining=days_remaining)
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/notifications/` | User's notification history (paginated) |
| `GET` | `/api/v1/notifications/unread-count/` | Count of unread notifications |
| `PATCH` | `/api/v1/notifications/<id>/read/` | Mark one notification as read |
| `POST` | `/api/v1/notifications/mark-all-read/` | Mark all as read |
| `POST` | `/api/v1/notifications/devices/register/` | Register FCM token on login |
| `POST` | `/api/v1/notifications/devices/unregister/` | Deactivate token on logout |
| `GET` | `/api/v1/notifications/devices/` | List user's registered devices |
| `POST` | `/api/v1/admin/notifications/send/` | Admin broadcast (staff only) |
| `GET` | `/api/v1/admin/notifications/` | All notifications list (staff only) |

---

## Celery Tasks Summary

| Task | Queue | Schedule | What it does |
|---|---|---|---|
| `deliver_push_notification` | `notifications` | On-demand | Sends one queued push delivery via Firebase |
| `send_push_notification` | `notifications` | On-demand | Legacy entry point — creates Notification + queues delivery |
| `send_sms_task` | `notifications` | On-demand | Sends SMS via Twilio or BudgetSMS (OTP only currently) |
| `send_low_stock_notification` | `notifications` | On-demand (signal) | Notifies owner of low stock event |
| `send_subscription_expiry_warning` | `notifications` | On-demand | Sends subscription expiry warning |
| `mark_notifications_read` | `notifications` | On-demand | Async batch mark-read |
| `requeue_stuck_deliveries` | `notifications` | Every 5 min | Reaper: rescues stuck/orphaned deliveries |
| `check_expiry_alerts` | `default` | Daily | Sends expiry warnings for batches |
| `check_subscription_expiry` | `default` | Daily | Marks expired subs + sends warnings |
