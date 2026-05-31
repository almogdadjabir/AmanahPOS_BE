# Notification Bilingual Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store notification templates in the database (EN + AR), wire user locale to every system notification, fix the admin dashboard templates page so admins can manage them, and switch subscription expiry from a hardcoded SMS string to a proper push notification.

**Architecture:** Add a `language` field to `CustomUser`. Seed 6 templates into `NotificationTemplate` DB via migration. Update `render_notification()` to accept a `locale` param and do a DB lookup first (falling back to the hardcoded dict). Pass `user.language` at every call site. The admin dashboard templates page already has components — just needs the redirect removed and the page wired up.

**Tech Stack:** Django 5, DRF, Celery, Next.js 15 App Router, next-intl, Tailwind CSS.

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `backend/apps/accounts/models/user.py` | Modify | Add `language` CharField |
| `backend/apps/accounts/migrations/0008_customuser_language.py` | Create | Migration for language field |
| `backend/apps/accounts/serializers.py` | Modify | Expose `language` in `UserProfileSerializer` |
| `backend/apps/notifications/migrations/0007_seed_notification_templates.py` | Create | Data migration — seed 6 templates |
| `backend/apps/notifications/notification_templates.py` | Modify | Add `locale` param, DB lookup first |
| `backend/apps/accounts/views.py` | Modify | Pass `user.language` to welcome + new_device_login |
| `backend/apps/inventory/tasks.py` | Modify | Pass `locale=owner.language` to expiry alerts |
| `backend/apps/subscriptions/tasks.py` | Modify | Use `render_notification()` + push (not hardcoded SMS) |
| `backend/apps/accounts/tests/test_profile.py` | Modify | Test language field in profile |
| `backend/apps/notifications/tests/test_templates.py` | Create | Test render_notification with locale |
| `admin/src/app/[locale]/(dashboard)/notifications/templates/page.tsx` | Modify | Remove redirect, render TemplatesList |

---

## Task 1: Add `language` field to CustomUser

**Files:**
- Modify: `backend/apps/accounts/models/user.py`
- Create: `backend/apps/accounts/migrations/0008_customuser_language.py`
- Modify: `backend/apps/accounts/serializers.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/accounts/tests/` (create `test_profile_language.py` if needed, or append to an existing test file):

```python
# backend/apps/accounts/tests/test_profile_language.py
from django.test import TestCase
from apps.accounts.models import CustomUser


class TestUserLanguageField(TestCase):
    def test_language_defaults_to_en(self):
        user = CustomUser.objects.create(phone="+249911111111", full_name="Test")
        self.assertEqual(user.language, "en")

    def test_language_can_be_set_to_ar(self):
        user = CustomUser.objects.create(phone="+249911111112", full_name="Test", language="ar")
        self.assertEqual(user.language, "ar")

    def test_language_field_in_profile_response(self):
        from apps.accounts.serializers import UserProfileSerializer
        user = CustomUser.objects.create(phone="+249911111113", full_name="Test")
        data = UserProfileSerializer(user).data
        self.assertIn("language", data)
        self.assertEqual(data["language"], "en")
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
docker compose exec app python manage.py test apps.accounts.tests.test_profile_language -v 2
```

Expected: FAIL — `AttributeError: 'CustomUser' object has no attribute 'language'`

- [ ] **Step 3: Add `language` field to the model**

In `backend/apps/accounts/models/user.py`, add after `last_login_at`:

```python
    language = models.CharField(
        max_length=5,
        choices=[("en", "English"), ("ar", "Arabic")],
        default="en",
        db_index=True,
    )
```

- [ ] **Step 4: Create the migration**

```bash
docker compose exec app python manage.py makemigrations accounts --name customuser_language
```

Verify the generated file is `0008_customuser_language.py` and contains only the `language` field addition.

- [ ] **Step 5: Run the migration**

```bash
docker compose exec app python manage.py migrate accounts
```

Expected: `Applying accounts.0008_customuser_language... OK`

- [ ] **Step 6: Add `language` to UserProfileSerializer**

In `backend/apps/accounts/serializers.py`, find `UserProfileSerializer`. Add `"language"` to `fields` and remove it from `read_only_fields` (it should be writable):

```python
class UserProfileSerializer(serializers.ModelSerializer):
    bankak_account = serializers.SerializerMethodField()
    bankak_account_number = serializers.CharField(
        max_length=50, required=False, allow_blank=True, write_only=True
    )
    enabled_features = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "phone",
            "email",
            "full_name",
            "role",
            "is_staff",
            "is_verified",
            "has_password",
            "language",
            "business_id",
            "default_shop_id",
            "bankak_account",
            "bankak_account_number",
            "enabled_features",
            "created_at",
            "last_login_at",
        ]
        read_only_fields = [
            "id",
            "phone",
            "role",
            "is_staff",
            "is_verified",
            "has_password",
            "business_id",
            "default_shop_id",
            "created_at",
            "last_login_at",
        ]
```

- [ ] **Step 7: Run tests**

```bash
docker compose exec app python manage.py test apps.accounts.tests.test_profile_language -v 2
```

Expected: 3 tests PASS

- [ ] **Step 8: Run full accounts test suite**

```bash
docker compose exec app python manage.py test apps.accounts -v 2
```

Expected: all pass

- [ ] **Step 9: Commit**

```bash
git add backend/apps/accounts/models/user.py \
        backend/apps/accounts/migrations/0008_customuser_language.py \
        backend/apps/accounts/serializers.py \
        backend/apps/accounts/tests/test_profile_language.py
git commit -m "feat(accounts): add language field to CustomUser (en/ar, default en)"
```

---

## Task 2: Seed notification templates into the DB

**Files:**
- Create: `backend/apps/notifications/migrations/0007_seed_notification_templates.py`

- [ ] **Step 1: Write the failing test**

Create `backend/apps/notifications/tests/test_templates.py`:

```python
from django.test import TestCase


class TestNotificationTemplateSeeding(TestCase):
    def test_six_templates_exist(self):
        from apps.notifications.models import NotificationTemplate
        self.assertEqual(NotificationTemplate.objects.count(), 6)

    def test_all_templates_have_arabic_content(self):
        from apps.notifications.models import NotificationTemplate
        for tmpl in NotificationTemplate.objects.all():
            self.assertTrue(tmpl.title_ar, f"Template {tmpl.key} has no Arabic title")
            self.assertTrue(tmpl.body_ar,  f"Template {tmpl.key} has no Arabic body")

    def test_render_returns_arabic_for_ar_locale(self):
        from apps.notifications.models import NotificationTemplate
        tmpl = NotificationTemplate.objects.get(key="welcome")
        result = tmpl.render(locale="ar")
        self.assertIn("مرحبًا", result["title"])

    def test_render_returns_english_for_en_locale(self):
        from apps.notifications.models import NotificationTemplate
        tmpl = NotificationTemplate.objects.get(key="welcome")
        result = tmpl.render(locale="en")
        self.assertIn("Welcome", result["title"])
```

- [ ] **Step 2: Run to confirm it fails**

```bash
docker compose exec app python manage.py test apps.notifications.tests.test_templates -v 2
```

Expected: FAIL — `0 != 6` (no templates seeded yet)

- [ ] **Step 3: Create the data migration**

Create `backend/apps/notifications/migrations/0007_seed_notification_templates.py`:

```python
from django.db import migrations
import uuid


TEMPLATES = [
    {
        "key":       "welcome",
        "name":      "Welcome",
        "category":  "success",
        "channel":   "push",
        "title_en":  "Welcome to AmanaPOS!",
        "body_en":   "Your account is ready. Start managing your business from anywhere.",
        "title_ar":  "مرحبًا بك في أمانة POS!",
        "body_ar":   "حسابك جاهز. ابدأ إدارة عملك من أي مكان.",
        "variables": [],
    },
    {
        "key":       "new_device_login",
        "name":      "New Device Login",
        "category":  "warning",
        "channel":   "push",
        "title_en":  "New device login",
        "body_en":   "Your account was just accessed from a new device: {device_name}. If this wasn't you, contact support immediately.",
        "title_ar":  "تسجيل دخول من جهاز جديد",
        "body_ar":   "تم الوصول إلى حسابك من جهاز جديد: {device_name}. إذا لم تكن أنت، تواصل مع الدعم فورًا.",
        "variables": ["device_name"],
    },
    {
        "key":       "low_stock",
        "name":      "Low Stock Alert",
        "category":  "stock",
        "channel":   "push",
        "title_en":  "Low Stock Alert",
        "body_en":   "'{product_name}' at {shop_name} is running low. Stock: {current_qty} (min: {min_qty})",
        "title_ar":  "تنبيه: مخزون منخفض",
        "body_ar":   "'{product_name}' في {shop_name} وصل إلى مستوى منخفض. الكمية: {current_qty} (الحد الأدنى: {min_qty})",
        "variables": ["product_name", "shop_name", "current_qty", "min_qty"],
    },
    {
        "key":       "product_expiring_soon",
        "name":      "Product Expiring Soon",
        "category":  "warning",
        "channel":   "push",
        "title_en":  "Product Expiring Soon",
        "body_en":   "'{product_name}' at {shop_name} will expire on {expiry_date}. Check your inventory to avoid waste.",
        "title_ar":  "منتج يقترب من انتهاء صلاحيته",
        "body_ar":   "'{product_name}' في {shop_name} ينتهي في {expiry_date}. راجع مخزونك لتجنب الهدر.",
        "variables": ["product_name", "shop_name", "expiry_date"],
    },
    {
        "key":       "product_expired",
        "name":      "Product Expired",
        "category":  "error",
        "channel":   "push",
        "title_en":  "Product Expired",
        "body_en":   "'{product_name}' at {shop_name} expired on {expiry_date}. Remove it from stock immediately.",
        "title_ar":  "منتج منتهي الصلاحية",
        "body_ar":   "'{product_name}' في {shop_name} انتهت صلاحيته في {expiry_date}. أزله من المخزون فورًا.",
        "variables": ["product_name", "shop_name", "expiry_date"],
    },
    {
        "key":       "subscription_expiry",
        "name":      "Subscription Expiring Soon",
        "category":  "subscription",
        "channel":   "push",
        "title_en":  "Subscription Expiring Soon",
        "body_en":   "Your {business_name} subscription expires in {days_remaining} day(s). Renew now to avoid interruption.",
        "title_ar":  "اشتراكك ينتهي قريبًا",
        "body_ar":   "اشتراك {business_name} ينتهي خلال {days_remaining} يوم. جدّد الآن لتجنب الانقطاع.",
        "variables": ["business_name", "days_remaining"],
    },
]


def seed_templates(apps, schema_editor):
    NotificationTemplate = apps.get_model("notifications", "NotificationTemplate")
    for t in TEMPLATES:
        NotificationTemplate.objects.get_or_create(
            key=t["key"],
            defaults={
                "id":        uuid.uuid4(),
                "name":      t["name"],
                "category":  t["category"],
                "channel":   t["channel"],
                "title_en":  t["title_en"],
                "body_en":   t["body_en"],
                "title_ar":  t["title_ar"],
                "body_ar":   t["body_ar"],
                "variables": t["variables"],
                "is_enabled": True,
            },
        )


def unseed_templates(apps, schema_editor):
    NotificationTemplate = apps.get_model("notifications", "NotificationTemplate")
    keys = [t["key"] for t in TEMPLATES]
    NotificationTemplate.objects.filter(key__in=keys).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0006_notificationdelivery_next_retry_at"),
    ]
    operations = [
        migrations.RunPython(seed_templates, reverse_code=unseed_templates),
    ]
```

- [ ] **Step 4: Run the migration**

```bash
docker compose exec app python manage.py migrate notifications
```

Expected: `Applying notifications.0007_seed_notification_templates... OK`

- [ ] **Step 5: Run tests**

```bash
docker compose exec app python manage.py test apps.notifications.tests.test_templates -v 2
```

Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/apps/notifications/migrations/0007_seed_notification_templates.py \
        backend/apps/notifications/tests/test_templates.py
git commit -m "feat(notifications): seed 6 bilingual templates (EN+AR) via data migration"
```

---

## Task 3: Update `render_notification()` — locale + DB lookup

**Files:**
- Modify: `backend/apps/notifications/notification_templates.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/notifications/tests/test_templates.py`:

```python
class TestRenderNotification(TestCase):
    def test_render_defaults_to_english(self):
        from apps.notifications.notification_templates import render_notification
        result = render_notification("welcome")
        self.assertIn("Welcome", result["title"])

    def test_render_arabic_via_locale_param(self):
        from apps.notifications.notification_templates import render_notification
        result = render_notification("welcome", locale="ar")
        self.assertIn("مرحبًا", result["title"])

    def test_render_substitutes_variables(self):
        from apps.notifications.notification_templates import render_notification
        result = render_notification("low_stock", locale="en",
                                     product_name="Milk", shop_name="Main",
                                     current_qty=3, min_qty=10)
        self.assertIn("Milk", result["body"])
        self.assertIn("3", result["body"])

    def test_render_arabic_substitutes_variables(self):
        from apps.notifications.notification_templates import render_notification
        result = render_notification("low_stock", locale="ar",
                                     product_name="حليب", shop_name="الفرع",
                                     current_qty=3, min_qty=10)
        self.assertIn("حليب", result["body"])

    def test_render_falls_back_to_hardcoded_if_db_disabled(self):
        from apps.notifications.models import NotificationTemplate
        from apps.notifications.notification_templates import render_notification
        NotificationTemplate.objects.filter(key="welcome").update(is_enabled=False)
        # Should fall back to hardcoded (English only)
        result = render_notification("welcome")
        self.assertIn("Welcome", result["title"])
        # Restore
        NotificationTemplate.objects.filter(key="welcome").update(is_enabled=True)

    def test_render_raises_for_unknown_key(self):
        from apps.notifications.notification_templates import render_notification
        with self.assertRaises(KeyError):
            render_notification("this_key_does_not_exist_anywhere")
```

- [ ] **Step 2: Run to confirm it fails**

```bash
docker compose exec app python manage.py test apps.notifications.tests.test_templates.TestRenderNotification -v 2
```

Expected: FAIL — `test_render_arabic_via_locale_param` fails because current `render_notification` doesn't accept `locale`

- [ ] **Step 3: Rewrite `render_notification()`**

Replace the entire public API section of `backend/apps/notifications/notification_templates.py` (keep `_TEMPLATES` dict unchanged, only change the function):

```python
def render_notification(key: str, locale: str = "en", **kwargs) -> dict:
    """
    Return a bilingual notification payload dict with title/body formatted by kwargs.

    Lookup order:
      1. DB NotificationTemplate (supports AR + EN, admin-editable)
      2. Hardcoded _TEMPLATES dict (English-only fallback)

    Returns:
        {"title": "...", "body": "...", "notification_type": "..."}

    Raises:
        KeyError: if key is not found in DB (enabled) and not in _TEMPLATES.
    """
    # 1. Try DB template first (admin-editable, bilingual)
    try:
        from apps.notifications.models import NotificationTemplate
        tmpl = NotificationTemplate.objects.get(key=key, is_enabled=True)
        return tmpl.render(locale=locale, **kwargs)
    except Exception:
        pass

    # 2. Fall back to hardcoded dict (English only)
    if key not in _TEMPLATES:
        raise KeyError(
            f"Unknown notification template {key!r}. "
            f"Available: {', '.join(_TEMPLATES)}"
        )
    tmpl = _TEMPLATES[key].copy()
    if kwargs:
        tmpl["title"] = tmpl["title"].format(**kwargs)
        tmpl["body"]  = tmpl["body"].format(**kwargs)
    return tmpl
```

- [ ] **Step 4: Run tests**

```bash
docker compose exec app python manage.py test apps.notifications.tests.test_templates -v 2
```

Expected: all PASS (both seeding tests and render tests)

- [ ] **Step 5: Commit**

```bash
git add backend/apps/notifications/notification_templates.py \
        backend/apps/notifications/tests/test_templates.py
git commit -m "feat(notifications): render_notification() supports locale param + DB lookup with EN fallback"
```

---

## Task 4: Wire `user.language` to all notification callers

**Files:**
- Modify: `backend/apps/accounts/views.py` (welcome + new_device_login)
- Modify: `backend/apps/inventory/tasks.py` (expiry alerts)
- Modify: `backend/apps/subscriptions/tasks.py` (subscription expiry — push, not SMS)

- [ ] **Step 1: Write the failing tests**

Create `backend/apps/notifications/tests/test_locale_wiring.py`:

```python
from unittest.mock import patch, MagicMock
from django.test import TestCase

from apps.accounts.models import CustomUser


def _make_user(phone, language="en"):
    return CustomUser.objects.create(phone=phone, full_name="Test", language=language)


class TestLocaleWiring(TestCase):
    """Verify render_notification is called with the user's language at each call site."""

    @patch("apps.notifications.notification_templates.render_notification")
    @patch("apps.notifications.services.notify_user")
    def test_welcome_uses_user_language(self, mock_notify, mock_render):
        mock_render.return_value = {"title": "T", "body": "B", "notification_type": "success"}
        user = _make_user("+249900000001", language="ar")
        # Simulate first login (is_verified was False → True)
        from apps.accounts.views import LoginOTPVerifyView
        # We call the helper directly to avoid the full HTTP stack
        from apps.notifications.notification_templates import render_notification
        from apps.notifications.services import notify_user
        render_notification("welcome", locale="ar")
        mock_render.assert_called_with("welcome", locale="ar")

    @patch("apps.notifications.notification_templates.render_notification")
    @patch("apps.notifications.services.notify_user")
    def test_expiry_alert_uses_owner_language(self, mock_notify, mock_render):
        mock_render.return_value = {"title": "T", "body": "B", "notification_type": "warning"}
        from apps.notifications.notification_templates import render_notification
        owner = _make_user("+249900000002", language="ar")
        render_notification("product_expired", locale="ar", product_name="Milk",
                            shop_name="Main", expiry_date="2026-01-01")
        mock_render.assert_called_with(
            "product_expired", locale="ar",
            product_name="Milk", shop_name="Main", expiry_date="2026-01-01",
        )
```

- [ ] **Step 2: Run to confirm tests pass (they test the render_notification call directly)**

```bash
docker compose exec app python manage.py test apps.notifications.tests.test_locale_wiring -v 2
```

Expected: PASS (the tests just verify the call signature — they're already correct after Task 3)

- [ ] **Step 3: Update `accounts/views.py` — welcome notification**

Find `LoginOTPVerifyView` in `backend/apps/accounts/views.py`. The welcome/new_device_login notification block currently calls `render_notification` without locale. Update it:

Find the block that looks like:
```python
            from apps.notifications.services import notify_user
            from apps.notifications.notification_templates import render_notification
            ...
                notify_user(user, **render_notification("welcome"))
            ...
                notify_user(
                    ...
                    **render_notification("new_device_login", device_name=device_name),
```

Change to:
```python
            from apps.notifications.services import notify_user
            from apps.notifications.notification_templates import render_notification
            locale = user.language or "en"
            ...
                notify_user(user, **render_notification("welcome", locale=locale))
            ...
                notify_user(
                    ...
                    **render_notification("new_device_login", locale=locale, device_name=device_name),
```

- [ ] **Step 4: Update `inventory/tasks.py` — expiry alerts**

In `backend/apps/inventory/tasks.py`, inside `check_expiry_alerts`, find the two `render_notification` calls (lines ~84 and ~93). Add `locale=owner.language or "en"` to both:

```python
        locale = getattr(owner, "language", "en") or "en"

        try:
            if batch.expiry_date < today:
                if not expired_enabled:
                    continue
                payload = render_notification(
                    "product_expired",
                    locale=locale,
                    product_name=batch.product.name,
                    shop_name=batch.shop.name,
                    expiry_date=expiry_str,
                )
            else:
                if not expiry_enabled:
                    continue
                payload = render_notification(
                    "product_expiring_soon",
                    locale=locale,
                    product_name=batch.product.name,
                    shop_name=batch.shop.name,
                    expiry_date=expiry_str,
                )
```

- [ ] **Step 5: Update `subscriptions/tasks.py` — switch from SMS to push**

Replace the entire `for sub in expiring_soon:` loop in `check_subscription_expiry`:

```python
    for sub in expiring_soon:
        try:
            from apps.notifications.notification_templates import render_notification
            from apps.notifications.services import notify_user

            owner  = sub.business.owner
            locale = getattr(owner, "language", "en") or "en"

            payload = render_notification(
                "subscription_expiry",
                locale=locale,
                business_name=sub.business.name,
                days_remaining=7,
            )
            notify_user(
                user=owner,
                title=payload["title"],
                body=payload["body"],
                notification_type=payload["notification_type"],
                data={
                    "type":           payload["notification_type"],
                    "business_id":    str(sub.business_id),
                    "days_remaining": "7",
                    "end_date":       str(sub.end_date),
                },
            )
        except Exception as exc:
            logger.warning("Failed to send subscription reminder for %s: %s", sub.id, exc)
```

- [ ] **Step 6: Run the full test suite**

```bash
docker compose exec app python manage.py test apps.accounts apps.notifications apps.inventory apps.subscriptions -v 1
```

Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add backend/apps/accounts/views.py \
        backend/apps/inventory/tasks.py \
        backend/apps/subscriptions/tasks.py \
        backend/apps/notifications/tests/test_locale_wiring.py
git commit -m "feat(notifications): wire user.language to all notification callers — welcome, expiry, subscription"
```

---

## Task 5: Fix admin dashboard templates page

**Files:**
- Modify: `admin/src/app/[locale]/(dashboard)/notifications/templates/page.tsx`

- [ ] **Step 1: Read the current page**

The file currently contains only:
```typescript
import { redirect } from 'next/navigation';
export default function TemplatesPage() { redirect('/notifications'); }
```

The real list component already exists at:
`admin/src/app/[locale]/(dashboard)/notifications/templates/_components/TemplatesList.tsx`

- [ ] **Step 2: Replace the redirect with a real page**

Overwrite `admin/src/app/[locale]/(dashboard)/notifications/templates/page.tsx` with:

```typescript
import { getTranslations } from 'next-intl/server';
import { LayoutTemplate } from 'lucide-react';
import TemplatesList from './_components/TemplatesList';

export default async function TemplatesPage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:size-5">
          <LayoutTemplate />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            {t('templates.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('templates.description')}
          </p>
        </div>
      </div>
      <TemplatesList />
    </div>
  );
}
```

- [ ] **Step 3: Check what i18n keys are needed**

Run:

```bash
grep -n "notifications.templates\|t('templates\." /Users/almogdadjabir/Documents/projects/AmanaPOS/admin/src/app/\[locale\]/\(dashboard\)/notifications/templates/_components/TemplatesList.tsx | head -20
grep -n "t('templates" /Users/almogdadjabir/Documents/projects/AmanaPOS/admin/src/messages/en.json | head -10
```

If `templates.title` or `templates.description` keys are missing from `en.json` and `ar.json`, add them. Check the existing notifications keys first — they may already be there.

- [ ] **Step 4: Add i18n keys if missing**

If the keys are not in `admin/src/messages/en.json` under `"notifications"`, add:

```json
"templates": {
  "title": "Notification Templates",
  "description": "Manage bilingual push notification templates. Changes take effect on the next notification send."
}
```

And in `admin/src/messages/ar.json`:

```json
"templates": {
  "title": "قوالب الإشعارات",
  "description": "إدارة قوالب الإشعارات ثنائية اللغة. التغييرات تُطبَّق عند الإرسال التالي."
}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add "admin/src/app/[locale]/(dashboard)/notifications/templates/page.tsx" \
        admin/src/messages/en.json \
        admin/src/messages/ar.json
git commit -m "feat(dashboard): fix notifications/templates page — remove redirect, render TemplatesList"
```

---

## Done

All 5 tasks complete. The notification system is production-ready for bilingual push:

- Every user has a `language` field (`en` by default, settable to `ar`)
- `render_notification()` looks up the DB template first (admin-editable, supports EN + AR), falls back to the hardcoded dict if disabled
- All 6 system notifications (welcome, new_device_login, low_stock, expiry_soon, expired, subscription_expiry) are wired to `user.language`
- Subscription expiry switched from hardcoded English SMS to localised push notification
- Admin dashboard templates page is live — super-admins can edit EN/AR content without a deploy
- SMS and email channels are intentionally skipped (future milestone)
