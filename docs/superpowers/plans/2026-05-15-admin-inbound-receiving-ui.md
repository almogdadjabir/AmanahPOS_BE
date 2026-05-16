# Admin Dashboard — Inventory Inbound Receiving UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the inventory inbound receiving feature end-to-end in the admin dashboard: admin can toggle the feature per-business, and the business owner can submit inbound stock transactions from the inventory page.

**Architecture:** The backend endpoint (`POST /api/v1/inventory/inbound/`) is already implemented and gated by `Plan.features["inventory_inbound_receiving"]`. The admin panel (Next.js 15 App Router, React 19) needs two additions: (1) a feature toggle inside the existing business-detail drawer so admins can enable/disable the feature on a plan, and (2) an inbound receiving panel on the owner inventory page that shows a form when the feature is enabled or a locked card when it is not.

**Tech Stack:** Next.js 15.3 App Router, React 19, TypeScript, Tailwind CSS, next-intl (ar/en), `useActionState` (React 19), Server Actions, no form library, no toast library.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `backend/apps/admin_panel/serializers.py` | Modify | Add `plan_id` to `get_active_subscription()` return value |
| `admin/src/types/api.ts` | Modify | Add `plan_id` to `AdminBusinessActiveSubscription`; add `enabled_features` to `UserProfile`; add `InboundTransaction` types |
| `admin/src/actions/businesses.ts` | Modify | Add `fetchBusinessFeaturesAction` + `updateBusinessFeatureAction` |
| `admin/src/app/.../businesses/_components/BusinessesDrawerShell.tsx` | Modify | Add premium-features section + `FeatureToggleRow` to `BusinessDetailContent` |
| `admin/src/messages/en.json` | Modify | Add `businesses.features.*` and `inventory.inbound.*` keys |
| `admin/src/messages/ar.json` | Modify | Same keys in Arabic |
| `admin/src/services/owner.ts` | Modify | Add `fetchUserProfile()` |
| `admin/src/actions/inventory.ts` | Modify | Add `createInboundTransactionAction` + `fetchProductsForShopAction` |
| `admin/src/app/.../inventory/_components/InboundReceivingPanel.tsx` | Create | Client component: locked card OR receive-stock button + drawer with form |
| `admin/src/app/.../inventory/page.tsx` | Modify | Fetch profile + pass enabled/shops to `InboundReceivingPanel` |

---

## Task 1: Backend — expose plan_id in admin business subscription

**Files:**
- Modify: `backend/apps/admin_panel/serializers.py:301-317`

- [ ] **Step 1: Read the current `get_active_subscription` method**

Open `backend/apps/admin_panel/serializers.py` and find `get_active_subscription` (around line 301). The current return dict is:
```python
return {
    "id":             str(sub.id),
    "plan_name":      sub.plan.name,
    "end_date":       str(sub.end_date),
    "days_remaining": sub.days_remaining,
}
```

- [ ] **Step 2: Add `plan_id` to the return dict**

Replace the `get_active_subscription` method body with:
```python
    def get_active_subscription(self, obj):
        today = timezone.now().date()
        sub = (
            obj.subscriptions
            .filter(is_active=True, end_date__gte=today)
            .select_related("plan")
            .order_by("-end_date")
            .first()
        )
        if not sub:
            return None
        return {
            "id":             str(sub.id),
            "plan_id":        str(sub.plan.id),
            "plan_name":      sub.plan.name,
            "end_date":       str(sub.end_date),
            "days_remaining": sub.days_remaining,
        }
```

- [ ] **Step 3: Verify the backend tests still pass**

```bash
cd backend
python manage.py test apps.admin_panel --verbosity=2
```
Expected: all tests pass (or no tests exist for this endpoint — that's OK).

- [ ] **Step 4: Commit**

```bash
git add backend/apps/admin_panel/serializers.py
git commit -m "feat: expose plan_id in admin business detail subscription"
```

---

## Task 2: Frontend types

**Files:**
- Modify: `admin/src/types/api.ts`

- [ ] **Step 1: Add `plan_id` to `AdminBusinessActiveSubscription`**

Find the `AdminBusinessActiveSubscription` interface (around line 274) and add `plan_id`:

```typescript
export interface AdminBusinessActiveSubscription {
  id: string;
  plan_id: string;
  plan_name: string;
  end_date: string;
  days_remaining: number;
}
```

- [ ] **Step 2: Add `enabled_features` to `UserProfile`**

Find the `UserProfile` interface (around line 124) and add the field:

```typescript
export interface UserProfile {
  id: string;
  phone: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  is_staff: boolean;
  is_verified: boolean;
  has_password: boolean;
  business_id: string | null;
  default_shop_id: string | null;
  created_at: string;
  last_login_at: string | null;
  bankak_phone: string | null;
  bankak_name: string | null;
  enabled_features: Record<string, boolean>;
}
```

- [ ] **Step 3: Add `InboundTransactionItem` and `InboundTransaction` types**

Append after the `StockMovement` interface (around line 107):

```typescript
export interface InboundTransactionItem {
  id: string;
  product: string;
  product_name: string;
  quantity: string;
  unit_cost: string | null;
  expiry_date: string | null;
  batch_number: string;
}

export interface InboundTransaction {
  id: string;
  reference: string;
  notes: string;
  shop: string;
  shop_name: string;
  item_count: number;
  items: InboundTransactionItem[];
  created_at: string;
}
```

- [ ] **Step 4: Confirm TypeScript compiles**

```bash
cd admin
npx tsc --noEmit 2>&1 | head -30
```
Expected: no type errors for the changed interfaces (or only pre-existing errors unrelated to this task).

- [ ] **Step 5: Commit**

```bash
git add admin/src/types/api.ts
git commit -m "feat: add plan_id, enabled_features, and InboundTransaction types"
```

---

## Task 3: Admin — feature toggle action + UI + i18n

**Files:**
- Modify: `admin/src/actions/businesses.ts`
- Modify: `admin/src/app/[locale]/(dashboard)/businesses/_components/BusinessesDrawerShell.tsx`
- Modify: `admin/src/messages/en.json`
- Modify: `admin/src/messages/ar.json`

### 3a: Actions

- [ ] **Step 1: Add result types and `fetchBusinessFeaturesAction` to `businesses.ts`**

At the end of `admin/src/actions/businesses.ts`, append:

```typescript
// ── Premium feature management ────────────────────────────────────────────────

export type FeaturesResult =
  | { ok: true; features: Record<string, boolean> }
  | { ok: false; error: string };

export async function fetchBusinessFeaturesAction(planId: string): Promise<FeaturesResult> {
  try {
    const res = await devFetch(`${API()}/api/v1/admin/plans/${planId}/`, {
      headers: { Authorization: `Bearer ${await authToken()}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    } as RequestInit);
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    const raw: Record<string, unknown> = (json?.data?.features) ?? {};
    return {
      ok: true,
      features: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Boolean(v)])),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export type UpdateFeatureState =
  | { success: true }
  | { error: string }
  | null;

export async function updateBusinessFeatureAction(
  planId:     string,
  featureKey: string,
  enabled:    boolean,
): Promise<UpdateFeatureState> {
  const current = await fetchBusinessFeaturesAction(planId);
  if (!current.ok) return { error: current.error };

  const updated = { ...current.features, [featureKey]: enabled };

  try {
    const res = await devFetch(`${API()}/api/v1/admin/plans/${planId}/`, {
      method:  'PATCH',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify({ features: updated }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update feature.') };
    revalidatePath('/[locale]/(dashboard)/businesses', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
```

- [ ] **Step 2: Verify `devFetch` signature**

`devFetch` in `@/lib/dev-logger` accepts `(url: string, init?: RequestInit)`. The first call uses a custom cache option — remove `cache: 'no-store'` from the options object and instead use standard fetch for the GET (no mutation, so caching is fine to bypass with `'no-store'` on the fetch init directly):

Replace the `fetchBusinessFeaturesAction` fetch call with:
```typescript
    const res = await fetch(`${API()}/api/v1/admin/plans/${planId}/`, {
      headers: { Authorization: `Bearer ${await authToken()}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
```

(Use plain `fetch` for the read; `devFetch` for the write. This matches how `fetchBusinessDetailAction` works in the same file.)

### 3b: i18n keys

- [ ] **Step 3: Add feature keys to `admin/src/messages/en.json`**

Inside `"businesses"`, after the last property (around `"detail"`), add:

```json
    "features": {
      "sectionTitle": "Premium Features",
      "noSubscription": "No active subscription — assign a plan to manage features.",
      "shopOnly": "Premium features are only available for shop-type businesses.",
      "inboundReceiving": "Inventory Inbound Receiving",
      "inboundReceivingDesc": "Allow this business's owners to record stock-in from suppliers.",
      "enabled": "On",
      "disabled": "Off"
    }
```

Inside `"inventory"`, after the `"history"` block, add:

```json
    "inbound": {
      "sectionTitle": "Receive Stock",
      "sectionDesc": "Record incoming stock from a supplier or purchase.",
      "receiveBtn": "Receive Stock",
      "drawerTitle": "Receive Stock",
      "drawerSubtitle": "Record a new inbound transaction",
      "reference": "Reference / Invoice #",
      "referencePlaceholder": "e.g. INV-20260515-001",
      "shop": "Shop",
      "notes": "Notes",
      "notesOptional": "(optional)",
      "notesPlaceholder": "Supplier, delivery notes…",
      "itemsTitle": "Items",
      "addItem": "Add item",
      "removeItem": "Remove",
      "product": "Product",
      "productPlaceholder": "Select product…",
      "quantity": "Qty",
      "unitCost": "Unit cost",
      "unitCostOptional": "(optional)",
      "expiryDate": "Expiry",
      "expiryDateOptional": "(optional)",
      "batchNumber": "Batch #",
      "batchNumberOptional": "(optional)",
      "submit": "Record Inbound",
      "submitting": "Saving…",
      "cancel": "Cancel",
      "successTitle": "Inbound recorded",
      "successDesc": "Reference {reference} saved successfully.",
      "premiumTitle": "Inventory Inbound Receiving",
      "premiumDesc": "Record supplier deliveries and auto-update stock. Upgrade your plan to unlock this feature.",
      "premiumBadge": "Premium",
      "loadingProducts": "Loading products…",
      "noProducts": "No active products found for this shop."
    }
```

- [ ] **Step 4: Add the same keys to `admin/src/messages/ar.json`**

Inside `"businesses"`, add:

```json
    "features": {
      "sectionTitle": "الميزات المميزة",
      "noSubscription": "لا يوجد اشتراك نشط — عيّن خطة لإدارة الميزات.",
      "shopOnly": "الميزات المميزة متاحة فقط للمحلات التجارية.",
      "inboundReceiving": "استلام المخزون الوارد",
      "inboundReceivingDesc": "يتيح لأصحاب هذا العمل تسجيل الكميات الواردة من الموردين.",
      "enabled": "مفعّل",
      "disabled": "معطّل"
    }
```

Inside `"inventory"`, add:

```json
    "inbound": {
      "sectionTitle": "استلام مخزون",
      "sectionDesc": "سجّل البضاعة الواردة من مورد أو عملية شراء.",
      "receiveBtn": "استلام مخزون",
      "drawerTitle": "استلام مخزون",
      "drawerSubtitle": "تسجيل حركة وارد جديدة",
      "reference": "المرجع / رقم الفاتورة",
      "referencePlaceholder": "مثال: INV-20260515-001",
      "shop": "الفرع",
      "notes": "ملاحظات",
      "notesOptional": "(اختياري)",
      "notesPlaceholder": "المورد، ملاحظات التسليم…",
      "itemsTitle": "الأصناف",
      "addItem": "إضافة صنف",
      "removeItem": "حذف",
      "product": "المنتج",
      "productPlaceholder": "اختر منتجاً…",
      "quantity": "الكمية",
      "unitCost": "سعر الوحدة",
      "unitCostOptional": "(اختياري)",
      "expiryDate": "تاريخ الانتهاء",
      "expiryDateOptional": "(اختياري)",
      "batchNumber": "رقم الدفعة",
      "batchNumberOptional": "(اختياري)",
      "submit": "تسجيل الوارد",
      "submitting": "جاري الحفظ…",
      "cancel": "إلغاء",
      "successTitle": "تم تسجيل الوارد",
      "successDesc": "تم حفظ المرجع {reference} بنجاح.",
      "premiumTitle": "استلام المخزون الوارد",
      "premiumDesc": "سجّل تسليمات الموردين وحدّث المخزون تلقائياً. رقّ خطتك لفتح هذه الميزة.",
      "premiumBadge": "ميزة مميزة",
      "loadingProducts": "جاري تحميل المنتجات…",
      "noProducts": "لم يتم العثور على منتجات نشطة لهذا الفرع."
    }
```

### 3c: Admin feature toggle UI

- [ ] **Step 5: Add state and feature-load logic to `BusinessDetailContent`**

In `BusinessesDrawerShell.tsx`, find `BusinessDetailContent` (around line 577). Add the following state declarations right after the existing ones (`business`, `loading`, `errorMsg`):

```tsx
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featureUpdating, setFeatureUpdating] = useState<string | null>(null);
  const [featureError, setFeatureError] = useState<string | null>(null);
```

- [ ] **Step 6: Load features after business loads**

Inside `BusinessDetailContent`, find the `load()` function (around line 592). Replace it with:

```typescript
  async function load() {
    setLoading(true);
    setErrorMsg(null);

    const result: BusinessDetailResult = await fetchBusinessDetailAction(businessId);

    if (result.ok) {
      setBusiness(result.data);
      const planId = result.data.active_subscription?.plan_id;
      if (planId && result.data.business_type === 'shop') {
        setFeaturesLoading(true);
        const featRes = await fetchBusinessFeaturesAction(planId);
        if (featRes.ok) setFeatures(featRes.features);
        setFeaturesLoading(false);
      }
    } else {
      setErrorMsg(result.error);
    }

    setLoading(false);
  }
```

- [ ] **Step 7: Add `handleFeatureToggle` function**

After the `load()` function in `BusinessDetailContent`, add:

```typescript
  async function handleFeatureToggle(featureKey: string, currentValue: boolean) {
    const planId = business?.active_subscription?.plan_id;
    if (!planId) return;
    setFeatureUpdating(featureKey);
    setFeatureError(null);
    const result = await updateBusinessFeatureAction(planId, featureKey, !currentValue);
    if (result && 'error' in result) {
      setFeatureError(result.error);
    } else {
      setFeatures(prev => prev ? { ...prev, [featureKey]: !currentValue } : prev);
    }
    setFeatureUpdating(null);
  }
```

- [ ] **Step 8: Add imports to `BusinessesDrawerShell.tsx`**

At the top of the file, add `Zap` to the lucide-react import and add the new action imports:

```typescript
import { Zap } from 'lucide-react';
import {
  fetchBusinessFeaturesAction,
  updateBusinessFeatureAction,
  type FeaturesResult,
} from '@/actions/businesses';
```

(Note: `FeaturesResult` may not be needed in the component directly, remove if unused.)

- [ ] **Step 9: Add the premium features section to `BusinessDetailContent` JSX**

Inside `BusinessDetailContent`, find the shops section (the `<div className="px-5 py-4">` containing the shops list, around line 812). After its closing `</div>`, add:

```tsx
      {/* Premium features — only for shops with an active plan */}
      {business.business_type === 'shop' && (
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap size={11} />
            </span>
            <p className="text-xs font-bold text-foreground">
              {t('features.sectionTitle')}
            </p>
          </div>

          {!business.active_subscription ? (
            <p className="text-[11px] text-muted-foreground italic">
              {t('features.noSubscription')}
            </p>
          ) : featuresLoading ? (
            <div className="h-14 rounded-xl bg-muted animate-pulse" />
          ) : features ? (
            <div className="space-y-2">
              {featureError && (
                <p className="text-[11px] text-destructive font-semibold">{featureError}</p>
              )}
              <FeatureToggleRow
                label={t('features.inboundReceiving')}
                description={t('features.inboundReceivingDesc')}
                enabled={features.inventory_inbound_receiving ?? false}
                updating={featureUpdating === 'inventory_inbound_receiving'}
                onToggle={() =>
                  handleFeatureToggle(
                    'inventory_inbound_receiving',
                    features.inventory_inbound_receiving ?? false,
                  )
                }
              />
            </div>
          ) : null}
        </div>
      )}
```

- [ ] **Step 10: Add `FeatureToggleRow` component at the bottom of `BusinessesDrawerShell.tsx`**

After the closing brace of the `StatBox` function (near the bottom of the file), add:

```tsx
function FeatureToggleRow({
  label,
  description,
  enabled,
  updating,
  onToggle,
}: {
  label:       string;
  description: string;
  enabled:     boolean;
  updating:    boolean;
  onToggle:    () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={updating}
        aria-pressed={enabled}
        className={cn(
          'relative shrink-0 w-10 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          enabled ? 'bg-success' : 'bg-muted-foreground/30',
          updating && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
            enabled ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
```

- [ ] **Step 11: Verify the `t` call namespace**

`BusinessDetailContent` uses `const t = useTranslations('businesses.drawer')`. The new keys must be added under `businesses.drawer.features.*`, not `businesses.features.*`. 

Go back to Step 3 and change the i18n keys location from `businesses.features` to `businesses.drawer.features` in **both** `en.json` and `ar.json`. The keys should be nested under `businesses > drawer > features`.

To find the right spot in en.json, look for `"drawer"` inside `"businesses"` and add `"features": { ... }` there.

- [ ] **Step 12: Verify TypeScript and run dev server briefly**

```bash
cd admin
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 13: Commit**

```bash
git add admin/src/actions/businesses.ts \
        "admin/src/app/[locale]/(dashboard)/businesses/_components/BusinessesDrawerShell.tsx" \
        admin/src/messages/en.json \
        admin/src/messages/ar.json
git commit -m "feat: admin — premium feature toggle in business detail drawer"
```

---

## Task 4: Owner — services, actions, and inbound UI

**Files:**
- Modify: `admin/src/services/owner.ts`
- Modify: `admin/src/actions/inventory.ts`
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundReceivingPanel.tsx`
- Modify: `admin/src/app/[locale]/(dashboard)/inventory/page.tsx`

### 4a: Owner profile service

- [ ] **Step 1: Add `fetchUserProfile` to `admin/src/services/owner.ts`**

At the top of `owner.ts`, add `UserProfile` to the type imports:

```typescript
import type { ApiList, ApiResponse, Sale, SalesSummary, StockLevel, Subscription, Business, UserProfile } from '@/types/api';
```

Then append this function at the end of the file (before `fetchOwnerDashboard`):

```typescript
export async function fetchUserProfile() {
  return safe(
    () => withUserCache(
      (tok) => apiGet<ApiResponse<UserProfile>>('/api/v1/accounts/profile/', undefined, { token: tok }),
      [CACHE_TAGS.profile],
      120,
    ),
    null,
  );
}
```

### 4b: Inbound actions

- [ ] **Step 2: Add `Product` to imports in `admin/src/actions/inventory.ts`**

Change the type import line to:

```typescript
import type { ApiList, StockLevel, StockMovement, Product } from '@/types/api';
```

- [ ] **Step 3: Add `fetchProductsForShopAction` to `admin/src/actions/inventory.ts`**

Append to the end of the file:

```typescript
// ── Products for a shop (used in inbound form) ────────────────────────────────

export type ProductsResult =
  | { ok: true; data: Product[] }
  | { ok: false; error: string };

export async function fetchProductsForShopAction(shopId: string): Promise<ProductsResult> {
  try {
    const url = new URL(`${API()}/api/v1/products/`);
    url.searchParams.set('shop', shopId);
    url.searchParams.set('is_active', 'true');
    url.searchParams.set('page_size', '200');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiList<Product>).results ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
```

- [ ] **Step 4: Add `createInboundTransactionAction` to `admin/src/actions/inventory.ts`**

Append after `fetchProductsForShopAction`:

```typescript
// ── Inbound receiving ────────────────────────────────────────────────────────

export type InboundState =
  | { success: true; reference: string }
  | { error: string }
  | null;

export async function createInboundTransactionAction(
  _prev: InboundState,
  formData: FormData,
): Promise<InboundState> {
  const shop      = (formData.get('shop')      as string)?.trim();
  const reference = (formData.get('reference') as string)?.trim();
  const notes     = (formData.get('notes')     as string)?.trim();
  const itemsJson = (formData.get('items')     as string)?.trim();

  if (!shop)      return { error: 'Shop is required.' };
  if (!reference) return { error: 'Reference / invoice number is required.' };

  type ItemInput = {
    product_id:   string;
    quantity:     string;
    unit_cost?:   string;
    expiry_date?: string;
    batch_number?: string;
  };

  let items: ItemInput[];
  try {
    items = JSON.parse(itemsJson || '[]');
  } catch {
    return { error: 'Invalid items payload.' };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'At least one item is required.' };
  }

  for (const item of items) {
    if (!item.product_id) return { error: 'Each item must have a product selected.' };
    const qty = Number(item.quantity);
    if (!item.quantity || isNaN(qty) || qty <= 0) {
      return { error: 'Each item must have a quantity greater than 0.' };
    }
  }

  const body: Record<string, unknown> = {
    shop,
    reference,
    items: items.map(i => ({
      product_id:   i.product_id,
      quantity:     i.quantity,
      unit_cost:    i.unit_cost   || undefined,
      expiry_date:  i.expiry_date || undefined,
      batch_number: i.batch_number || undefined,
    })),
  };
  if (notes) body.notes = notes;

  try {
    const res = await fetch(`${API()}/api/v1/inventory/inbound/`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to record inbound.') };
    revalidatePath('/[locale]/(dashboard)/inventory', 'page');
    return { success: true, reference };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
```

### 4c: InboundReceivingPanel component

- [ ] **Step 5: Create `InboundReceivingPanel.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundReceivingPanel.tsx` with the following content:

```tsx
'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, Lock, Plus, Trash2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Drawer from '@/components/ds/Drawer';
import {
  createInboundTransactionAction,
  fetchProductsForShopAction,
  type InboundState,
} from '@/actions/inventory';
import type { Shop, Product } from '@/types/api';

// ── Public export ─────────────────────────────────────────────────────────────

interface Props {
  enabled: boolean;
  shops:   Shop[];
}

export default function InboundReceivingPanel({ enabled, shops }: Props) {
  const t = useTranslations('inventory');
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!enabled) {
    return <PremiumLockedCard />;
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 mb-5">
        <div>
          <p className="text-sm font-bold text-foreground">{t('inbound.sectionTitle')}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t('inbound.sectionDesc')}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} />
          {t('inbound.receiveBtn')}
        </Button>
      </div>

      <InboundDrawer
        open={open}
        shops={shops}
        onClose={() => setOpen(false)}
        onSuccess={(ref) => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

// ── Locked card ───────────────────────────────────────────────────────────────

function PremiumLockedCard() {
  const t = useTranslations('inventory');
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/40 px-4 py-4 mb-5">
      <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
        <Lock size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-foreground">{t('inbound.premiumTitle')}</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200/60">
            <Zap size={9} />
            {t('inbound.premiumBadge')}
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground mt-1">{t('inbound.premiumDesc')}</p>
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

interface DrawerProps {
  open:      boolean;
  shops:     Shop[];
  onClose:   () => void;
  onSuccess: (reference: string) => void;
}

function InboundDrawer({ open, shops, onClose, onSuccess }: DrawerProps) {
  const t = useTranslations('inventory');
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('inbound.drawerTitle')}
      subtitle={t('inbound.drawerSubtitle')}
    >
      {open && (
        <DrawerContent
          key={String(open)}
          shops={shops}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  );
}

// ── DrawerContent (form) ──────────────────────────────────────────────────────

type ItemRow = {
  _id:          string;
  product_id:   string;
  quantity:     string;
  unit_cost:    string;
  expiry_date:  string;
  batch_number: string;
};

function newRow(): ItemRow {
  return {
    _id:          crypto.randomUUID(),
    product_id:   '',
    quantity:     '',
    unit_cost:    '',
    expiry_date:  '',
    batch_number: '',
  };
}

function DrawerContent({
  shops,
  onClose,
  onSuccess,
}: {
  shops:     Shop[];
  onClose:   () => void;
  onSuccess: (reference: string) => void;
}) {
  const t = useTranslations('inventory');

  const defaultShop = shops[0]?.id ?? '';
  const [shopId, setShopId]   = useState(defaultShop);
  const [rows,   setRows]     = useState<ItemRow[]>([newRow()]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const [state, dispatch, isPending] = useActionState<InboundState, FormData>(
    createInboundTransactionAction,
    null,
  );

  // Load products when shopId changes
  useEffect(() => {
    if (!shopId) return;
    setLoadingProducts(true);
    fetchProductsForShopAction(shopId).then((res) => {
      setProducts(res.ok ? res.data : []);
      setLoadingProducts(false);
    });
  }, [shopId]);

  // Handle success
  useEffect(() => {
    if (state && 'success' in state) {
      onSuccess(state.reference);
    }
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const hiddenItems = form.querySelector<HTMLInputElement>('[name="items"]')!;
    hiddenItems.value = JSON.stringify(
      rows.map(({ product_id, quantity, unit_cost, expiry_date, batch_number }) => ({
        product_id,
        quantity,
        unit_cost:    unit_cost    || undefined,
        expiry_date:  expiry_date  || undefined,
        batch_number: batch_number || undefined,
      })),
    );
  }

  function addRow() {
    setRows(r => [...r, newRow()]);
  }

  function removeRow(id: string) {
    setRows(r => r.filter(row => row._id !== id));
  }

  function updateRow(id: string, field: keyof Omit<ItemRow, '_id'>, value: string) {
    setRows(r => r.map(row => row._id === id ? { ...row, [field]: value } : row));
  }

  return (
    <form
      ref={formRef}
      action={dispatch}
      onSubmit={handleSubmit}
      className="flex flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {error && <FormError message={error} />}

          {/* Hidden serialised items */}
          <input type="hidden" name="items" />

          {/* Shop selector — only when multiple shops */}
          {shops.length > 1 ? (
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">
                {t('inbound.shop')}
              </label>
              <select
                name="shop"
                value={shopId}
                onChange={e => setShopId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="shop" value={defaultShop} />
          )}

          {/* Reference */}
          <Input
            label={t('inbound.reference')}
            name="reference"
            type="text"
            required
            placeholder={t('inbound.referencePlaceholder')}
          />

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              {t('inbound.notes')}{' '}
              <span className="text-muted-foreground font-normal">{t('inbound.notesOptional')}</span>
            </label>
            <textarea
              name="notes"
              placeholder={t('inbound.notesPlaceholder')}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors resize-none"
            />
          </div>

          {/* Items */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">{t('inbound.itemsTitle')}</p>

            {loadingProducts ? (
              <p className="text-xs text-muted-foreground py-2">{t('inbound.loadingProducts')}</p>
            ) : products.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">{t('inbound.noProducts')}</p>
            ) : (
              <div className="space-y-3">
                {rows.map((row, idx) => (
                  <ItemRowEditor
                    key={row._id}
                    row={row}
                    index={idx}
                    products={products}
                    canRemove={rows.length > 1}
                    onUpdate={(field, value) => updateRow(row._id, field, value)}
                    onRemove={() => removeRow(row._id)}
                    removeLabel={t('inbound.removeItem')}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addRow}
              disabled={products.length === 0}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:pointer-events-none"
            >
              <Plus size={12} />
              {t('inbound.addItem')}
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
        <Button variant="secondary" size="sm" type="button" onClick={onClose}>
          {t('inbound.cancel')}
        </Button>
        <Button size="sm" type="submit" disabled={isPending || products.length === 0}>
          {isPending ? t('inbound.submitting') : t('inbound.submit')}
        </Button>
      </div>
    </form>
  );
}

// ── Item row editor ───────────────────────────────────────────────────────────

function ItemRowEditor({
  row,
  index,
  products,
  canRemove,
  onUpdate,
  onRemove,
  removeLabel,
}: {
  row:         ItemRow;
  index:       number;
  products:    Product[];
  canRemove:   boolean;
  onUpdate:    (field: keyof Omit<ItemRow, '_id'>, value: string) => void;
  onRemove:    () => void;
  removeLabel: string;
}) {
  const t = useTranslations('inventory');
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
          #{index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-[11px] font-semibold text-destructive hover:underline"
          >
            <Trash2 size={11} />
            {removeLabel}
          </button>
        )}
      </div>

      {/* Product */}
      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">
          {t('inbound.product')}
        </label>
        <select
          value={row.product_id}
          onChange={e => onUpdate('product_id', e.target.value)}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{t('inbound.productPlaceholder')}</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.sku ? ` (${p.sku})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity + Unit cost */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            {t('inbound.quantity')}
          </label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            required
            value={row.quantity}
            onChange={e => onUpdate('quantity', e.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            {t('inbound.unitCost')}{' '}
            <span className="text-muted-foreground font-normal">{t('inbound.unitCostOptional')}</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={row.unit_cost}
            onChange={e => onUpdate('unit_cost', e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Expiry + Batch */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            {t('inbound.expiryDate')}{' '}
            <span className="text-muted-foreground font-normal">{t('inbound.expiryDateOptional')}</span>
          </label>
          <input
            type="date"
            value={row.expiry_date}
            onChange={e => onUpdate('expiry_date', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            {t('inbound.batchNumber')}{' '}
            <span className="text-muted-foreground font-normal">{t('inbound.batchNumberOptional')}</span>
          </label>
          <input
            type="text"
            value={row.batch_number}
            onChange={e => onUpdate('batch_number', e.target.value)}
            placeholder="LOT-001"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}

// ── FormError ─────────────────────────────────────────────────────────────────

function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3">
      <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-xs font-semibold text-destructive leading-relaxed">{message}</p>
    </div>
  );
}
```

### 4d: Inventory page integration

- [ ] **Step 6: Update `admin/src/app/[locale]/(dashboard)/inventory/page.tsx`**

Replace the entire file with:

```tsx
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
import InventoryDrawerShell from './_components/InventoryDrawerShell';
import InventoryPageHeader from './_components/InventoryPageHeader';
import InventoryStats, { InventoryStatsSkeleton } from './_components/InventoryStats';
import InventoryFilters from './_components/InventoryFilters';
import InventoryTable from './_components/InventoryTable';
import InboundReceivingPanel from './_components/InboundReceivingPanel';
import { fetchBusiness, fetchUserProfile } from '@/services/owner';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?:   string;
  }>;
}

export default async function InventoryPage({ searchParams }: Props) {
  const [bizRes, profileRes] = await Promise.all([fetchBusiness(), fetchUserProfile()]);
  if (bizRes?.data?.[0]?.business_type !== 'shop') notFound();

  const params   = await searchParams;
  const page     = Math.max(1, Number(params.page) || 1);
  const tableKey = JSON.stringify({ search: params.search, status: params.status, page });

  const isInboundEnabled = Boolean(
    profileRes?.data?.enabled_features?.inventory_inbound_receiving,
  );
  const shops = bizRes?.data?.[0]?.shops ?? [];

  return (
    <InventoryDrawerShell>
      <InventoryPageHeader />

      <InboundReceivingPanel enabled={isInboundEnabled} shops={shops} />

      <ErrorBoundary fallback={<SectionError message="Failed to load inventory stats" />}>
        <Suspense fallback={<InventoryStatsSkeleton />}>
          <InventoryStats />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError message="Failed to load filters" />}>
        <Suspense fallback={<div className="h-[52px] rounded-xl bg-muted animate-pulse mb-5" />}>
          <InventoryFilters />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError message="Failed to load inventory" />}>
        <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={6} />}>
          <InventoryTable
            search={params.search}
            status={params.status}
            page={page}
          />
        </Suspense>
      </ErrorBoundary>
    </InventoryDrawerShell>
  );
}
```

- [ ] **Step 7: Run TypeScript check**

```bash
cd admin
npx tsc --noEmit 2>&1 | head -40
```

Fix any type errors before proceeding.

- [ ] **Step 8: Start the dev server and verify visually**

```bash
cd admin
npm run dev
```

Open `http://localhost:3000/en/inventory`:
- If feature disabled (no `inventory_inbound_receiving` in plan features): you should see the amber locked card with a lock icon.
- If feature enabled: you should see the "Receive Stock" panel with a button. Click it — the drawer should open. Fill a reference, select a product, enter a quantity, submit — the inventory page should refresh.

Also open the businesses page, click a shop-type business, open the detail drawer — scroll to the bottom and you should see "Premium Features" section with a toggle for "Inventory Inbound Receiving".

- [ ] **Step 9: Commit**

```bash
git add admin/src/services/owner.ts \
        admin/src/actions/inventory.ts \
        "admin/src/app/[locale]/(dashboard)/inventory/_components/InboundReceivingPanel.tsx" \
        "admin/src/app/[locale]/(dashboard)/inventory/page.tsx"
git commit -m "feat: owner — inventory inbound receiving panel and form"
```

---

## Self-Review Checklist

- [x] **Backend change**: `plan_id` added to `get_active_subscription()` — covered in Task 1
- [x] **Types**: `plan_id`, `enabled_features`, `InboundTransaction*` — covered in Task 2
- [x] **Admin toggle**: fetch plan features → toggle → PATCH plan — covered in Task 3
- [x] **i18n**: both en.json and ar.json with all keys — covered in Task 3 steps 3-4
- [x] **Owner profile service**: `fetchUserProfile()` — covered in Task 4a
- [x] **Inbound actions**: `createInboundTransactionAction`, `fetchProductsForShopAction` — Task 4b
- [x] **Owner UI**: `InboundReceivingPanel` with locked card + form drawer — Task 4c
- [x] **Page integration**: `inventory/page.tsx` fetches profile + passes to panel — Task 4d

**Edge cases handled:**
- No active subscription on business → shows "No active subscription" message in features section
- Restaurant-type business → features section hidden entirely
- `enabled_features` absent or empty (owner with no plan) → `Boolean(undefined) = false` → locked card shown
- Single shop → shop selector hidden, `shop` value passed as hidden field
- Products fail to load → "No active products" message, submit disabled
- Duplicate reference → 400 from backend → surfaced as form error via `extractApiError`
- Feature toggle failure → `featureError` shown inline in the features section
