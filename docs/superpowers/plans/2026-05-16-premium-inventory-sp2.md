# Premium Inventory Sub-project 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the owner Inventory page into a premium tabbed dashboard (Stock | Inbound | Vendors) with 8 KPI cards, a paginated inbound transactions list with detail drawer, and full vendor management (add, edit, deactivate) — feature-gated behind `inventory_inbound_receiving`.

**Architecture:** Client-side tab state in a new `PremiumInventoryShell` Client Component. Stock tab content is pre-rendered server-side and passed as `children`. Inbound and Vendors tabs are lazy Client Components that fetch data on first activation. When the feature is disabled, a `PremiumLockedInventoryCard` renders above the unchanged basic stock table.

**Tech Stack:** Next.js 15 App Router, React 19 `useActionState`, TypeScript, Tailwind CSS, next-intl, existing `Drawer`/`StatCard`/`Button`/`Input` components.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `admin/src/actions/inventory.ts` | Add 6 new actions + 2 new types |
| Modify | `admin/src/messages/en.json` | Add `premium.*`, `vendors.*`, `inboundList.*` keys |
| Modify | `admin/src/messages/ar.json` | Same keys in Arabic |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumLockedInventoryCard.tsx` | Amber gilded locked card (Server Component) |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumKPIRow.tsx` | 8 KPI stat cards (Client Component, data via props) |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundTransactionsList.tsx` | Paginated inbound table with lazy fetch |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundTransactionDetailDrawer.tsx` | Full transaction detail in Drawer |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/VendorsList.tsx` | Vendor card list with search + deactivate |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/VendorDrawer.tsx` | Add/edit vendor form in Drawer |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx` | Tab shell Client Component |
| Modify | `admin/src/app/[locale]/(dashboard)/inventory/page.tsx` | Parallel fetch + conditional render |

**Do not modify:** `InboundReceivingPanel.tsx`, `InventoryStats.tsx`, `InventoryFilters.tsx`, `InventoryTable.tsx`, `InventoryDrawerShell.tsx`.

---

## Task 1: i18n keys + new server actions

**Files:**
- Modify: `admin/src/messages/en.json`
- Modify: `admin/src/messages/ar.json`
- Modify: `admin/src/actions/inventory.ts`

### 1a — i18n

- [ ] **Step 1: Add premium/vendor/inbound-list keys to `en.json`**

In `admin/src/messages/en.json`, locate the `"inventory"` object. After the last property (after the closing `}` of `"inbound"`), add:

```json
    "premium": {
      "lockedTitle": "Advanced Inventory",
      "lockedDesc": "Unlock inbound receiving, vendor tracking, expiry reports, and low-stock insights.",
      "tabStock": "Stock",
      "tabInbound": "Inbound",
      "tabVendors": "Vendors",
      "kpiExpiringSoon": "Expiring Soon",
      "kpiExpired": "Expired",
      "kpiActiveVendors": "Active Vendors",
      "kpiInboundThisMonth": "Inbound This Month",
      "kpiUnitsReceived": "Units Received"
    },
    "vendors": {
      "title": "Vendors",
      "addVendor": "Add Vendor",
      "editVendor": "Edit Vendor",
      "searchPlaceholder": "Search vendors…",
      "showAll": "Show all",
      "activeOnly": "Active only",
      "name": "Vendor name",
      "namePlaceholder": "e.g. Al Noor Groceries",
      "phone": "Phone",
      "email": "Email",
      "address": "Address",
      "notes": "Notes",
      "save": "Save vendor",
      "saving": "Saving…",
      "deactivate": "Deactivate",
      "reactivate": "Re-activate",
      "empty": "No vendors yet — add your first supplier.",
      "emptySearch": "No vendors match your search.",
      "failedToLoad": "Failed to load vendors"
    },
    "inboundList": {
      "title": "Inbound Transactions",
      "colReference": "Reference",
      "colVendor": "Vendor",
      "colShop": "Shop",
      "colItems": "Items",
      "colQty": "Total Qty",
      "colDate": "Date",
      "loadMore": "Load more",
      "empty": "No inbound transactions yet — click Receive Stock to record your first delivery.",
      "failedToLoad": "Failed to load transactions",
      "drawerTitle": "Inbound Detail",
      "vendor": "Vendor",
      "notes": "Notes",
      "createdBy": "Recorded by",
      "items": "Items",
      "colProduct": "Product",
      "colUnitCost": "Unit Cost",
      "colExpiry": "Expiry",
      "colBatch": "Batch #"
    }
```

- [ ] **Step 2: Add same keys to `ar.json`**

In `admin/src/messages/ar.json`, add the same structure after the `"inbound"` section:

```json
    "premium": {
      "lockedTitle": "مخزون متقدم",
      "lockedDesc": "افتح استلام المخزون وتتبع الموردين وتقارير الانتهاء ورؤى المخزون المنخفض.",
      "tabStock": "المخزون",
      "tabInbound": "الوارد",
      "tabVendors": "الموردون",
      "kpiExpiringSoon": "تنتهي قريباً",
      "kpiExpired": "منتهية الصلاحية",
      "kpiActiveVendors": "موردون نشطون",
      "kpiInboundThisMonth": "وارد هذا الشهر",
      "kpiUnitsReceived": "وحدات مستلمة"
    },
    "vendors": {
      "title": "الموردون",
      "addVendor": "إضافة مورد",
      "editVendor": "تعديل مورد",
      "searchPlaceholder": "بحث عن مورد…",
      "showAll": "عرض الكل",
      "activeOnly": "النشطون فقط",
      "name": "اسم المورد",
      "namePlaceholder": "مثال: البيت التجاري",
      "phone": "الهاتف",
      "email": "البريد الإلكتروني",
      "address": "العنوان",
      "notes": "ملاحظات",
      "save": "حفظ المورد",
      "saving": "جارٍ الحفظ…",
      "deactivate": "إيقاف",
      "reactivate": "إعادة تفعيل",
      "empty": "لا يوجد موردون — أضف أول مورد.",
      "emptySearch": "لا يوجد موردون يطابقون بحثك.",
      "failedToLoad": "فشل تحميل الموردين"
    },
    "inboundList": {
      "title": "حركات الوارد",
      "colReference": "المرجع",
      "colVendor": "المورد",
      "colShop": "الفرع",
      "colItems": "الأصناف",
      "colQty": "الكمية الإجمالية",
      "colDate": "التاريخ",
      "loadMore": "تحميل المزيد",
      "empty": "لا توجد حركات وارد — اضغط استلام مخزون لتسجيل أول تسليم.",
      "failedToLoad": "فشل تحميل الحركات",
      "drawerTitle": "تفاصيل الوارد",
      "vendor": "المورد",
      "notes": "ملاحظات",
      "createdBy": "سُجِّل بواسطة",
      "items": "الأصناف",
      "colProduct": "المنتج",
      "colUnitCost": "سعر الوحدة",
      "colExpiry": "تاريخ الانتهاء",
      "colBatch": "رقم الدفعة"
    }
```

### 1b — New server actions

- [ ] **Step 3: Add 6 new actions to `admin/src/actions/inventory.ts`**

Append to the end of `admin/src/actions/inventory.ts`:

```typescript
// ── Vendor list (management — supports showAll + search) ──────────────────────

export interface VendorsManagementParams {
  search?:  string;
  showAll?: boolean;
}

export async function fetchVendorsManagementAction(
  params: VendorsManagementParams = {},
): Promise<VendorsResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/vendors/`);
    if (!params.showAll) url.searchParams.set('is_active', 'true');
    if (params.search)   url.searchParams.set('search', params.search);
    url.searchParams.set('page_size', '200');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiList<Vendor>).results ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Inbound transaction list ───────────────────────────────────────────────────

export interface InboundListParams {
  vendor_id?: string;
  shop_id?:   string;
  search?:    string;
  page?:      number;
}

export type InboundListResult =
  | { ok: true; data: InboundTransaction[]; count: number; total_pages: number }
  | { ok: false; error: string };

export async function fetchInboundListAction(
  params: InboundListParams = {},
): Promise<InboundListResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/inbound/`);
    if (params.vendor_id) url.searchParams.set('vendor_id', params.vendor_id);
    if (params.shop_id)   url.searchParams.set('shop_id',   params.shop_id);
    if (params.search)    url.searchParams.set('search',    params.search);
    if (params.page)      url.searchParams.set('page',      String(params.page));
    url.searchParams.set('page_size', '20');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    const list = json as ApiList<InboundTransaction>;
    return { ok: true, data: list.results ?? [], count: list.count ?? 0, total_pages: list.total_pages ?? 1 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Vendor mutations ──────────────────────────────────────────────────────────

export type VendorFormState =
  | { success: true; vendor: Vendor }
  | { error: string }
  | null;

export async function createVendorAction(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const name    = (formData.get('name')    as string)?.trim();
  const phone   = (formData.get('phone')   as string)?.trim();
  const email   = (formData.get('email')   as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  const notes   = (formData.get('notes')   as string)?.trim();

  if (!name) return { error: 'Vendor name is required.' };

  try {
    const res = await devFetch(`${API()}/api/v1/inventory/vendors/`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        phone:   phone   || undefined,
        email:   email   || undefined,
        address: address || undefined,
        notes:   notes   || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to create vendor.') };
    return { success: true, vendor: (data as ApiResponse<Vendor>).data };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export async function updateVendorAction(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const id      = (formData.get('id')      as string)?.trim();
  const name    = (formData.get('name')    as string)?.trim();
  const phone   = (formData.get('phone')   as string)?.trim();
  const email   = (formData.get('email')   as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  const notes   = (formData.get('notes')   as string)?.trim();

  if (!id)   return { error: 'Vendor ID is missing.' };
  if (!name) return { error: 'Vendor name is required.' };

  try {
    const res = await devFetch(`${API()}/api/v1/inventory/vendors/${id}/`, {
      method: 'PATCH',
      headers: {
        Authorization:  `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, phone, email, address, notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update vendor.') };
    return { success: true, vendor: (data as ApiResponse<Vendor>).data };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export async function deactivateVendorAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await devFetch(`${API()}/api/v1/inventory/vendors/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await authToken()}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: extractApiError(data, res.status, 'Failed to deactivate vendor.') };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

export async function reactivateVendorAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await devFetch(`${API()}/api/v1/inventory/vendors/${id}/`, {
      method: 'PATCH',
      headers: {
        Authorization:  `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: extractApiError(data, res.status, 'Failed to reactivate vendor.') };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add admin/src/messages/en.json admin/src/messages/ar.json admin/src/actions/inventory.ts
git commit -m "feat: vendor/inbound-list actions and i18n for premium inventory SP2"
```

---

## Task 2: `PremiumLockedInventoryCard` + `PremiumKPIRow`

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumLockedInventoryCard.tsx`
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumKPIRow.tsx`

- [ ] **Step 1: Create `PremiumLockedInventoryCard.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumLockedInventoryCard.tsx`:

```tsx
import { Lock, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function PremiumLockedInventoryCard() {
  const t = await getTranslations('inventory');
  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-5"
      style={{
        background:  'linear-gradient(135deg, rgba(120,53,15,0.16) 0%, rgba(180,83,9,0.09) 55%, rgba(217,119,6,0.04) 100%)',
        border:      '1px solid rgba(217,119,6,0.22)',
        boxShadow:   'inset 0 1px 0 rgba(251,191,36,0.14), 0 2px 16px rgba(120,53,15,0.08)',
      }}
    >
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 pointer-events-none animate-premium-shimmer"
        style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(251,191,36,0.07) 50%, transparent 65%)' }}
        aria-hidden
      />
      {/* Top gold accent line */}
      <div
        className="absolute top-0 left-8 right-8 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.55), transparent)' }}
        aria-hidden
      />

      <div className="relative px-5 pt-5 pb-4">
        {/* Badge */}
        <div className="mb-4">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.13em] uppercase px-2.5 py-1 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(217,119,6,0.16), rgba(245,158,11,0.08))',
              border:     '1px solid rgba(217,119,6,0.28)',
              color:      'rgb(146,64,14)',
            }}
          >
            <Zap size={9} strokeWidth={2.5} />
            {t('inbound.premiumBadge')}
          </span>
        </div>

        <div className="flex items-start gap-4">
          {/* Lock icon */}
          <div
            className="shrink-0 mt-0.5 flex items-center justify-center"
            style={{
              width: 48, height: 48,
              background:   'linear-gradient(145deg, rgba(120,53,15,0.32), rgba(146,64,14,0.16))',
              border:       '1px solid rgba(217,119,6,0.26)',
              borderRadius: 14,
              boxShadow:    '0 2px 10px rgba(120,53,15,0.16), inset 0 1px 0 rgba(251,191,36,0.16)',
            }}
          >
            <Lock size={20} strokeWidth={2} style={{ color: 'rgb(146,64,14)' }} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-snug mb-1.5" style={{ color: 'rgb(101,40,8)' }}>
              {t('premium.lockedTitle')}
            </p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {t('premium.lockedDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Decorative dot grid */}
      <div className="absolute bottom-3 right-4 pointer-events-none select-none" style={{ opacity: 0.055 }} aria-hidden>
        <svg width="52" height="28" viewBox="0 0 52 28" fill="none">
          {[0,9,18,27,36,45].flatMap(x =>
            [0,9,18].map(y => (
              <circle key={`${x}-${y}`} cx={x + 4} cy={y + 4} r={1.8} fill="rgb(146,64,14)" />
            ))
          )}
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `PremiumKPIRow.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumKPIRow.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowDownToLine,
  Calendar,
  Package,
  ShoppingCart,
  Users,
  XCircle,
} from 'lucide-react';
import StatCard from '@/components/ds/StatCard';
import type { PremiumInventorySummary } from '@/types/api';

export default function PremiumKPIRow({ data }: { data: PremiumInventorySummary }) {
  const t = useTranslations('inventory');
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label={t('stats.totalSkus')}
        value={data.stock_items_count}
        sub={t('stats.totalSkusSub')}
        icon={<Package />}
        accent="text-primary bg-primary/10"
      />
      <StatCard
        label={t('stats.lowStock')}
        value={data.low_stock_count}
        sub={t('stats.lowStockSub')}
        icon={<AlertTriangle />}
        accent="text-amber-600 bg-amber-50"
      />
      <StatCard
        label={t('stats.outOfStock')}
        value={data.out_of_stock_count}
        sub={t('stats.outOfStockSub')}
        icon={<XCircle />}
        accent="text-destructive bg-destructive/10"
      />
      <StatCard
        label={t('premium.kpiExpiringSoon')}
        value={data.expiring_soon_count}
        sub="≤ 30 days"
        icon={<Calendar />}
        accent="text-orange-600 bg-orange-50"
      />
      <StatCard
        label={t('premium.kpiExpired')}
        value={data.expired_count}
        icon={<XCircle />}
        accent="text-red-700 bg-red-50"
      />
      <StatCard
        label={t('premium.kpiActiveVendors')}
        value={data.active_vendors_count}
        icon={<Users />}
        accent="text-violet-600 bg-violet-50"
      />
      <StatCard
        label={t('premium.kpiInboundThisMonth')}
        value={data.inbound_this_month_count}
        icon={<ArrowDownToLine />}
        accent="text-blue-600 bg-blue-50"
      />
      <StatCard
        label={t('premium.kpiUnitsReceived')}
        value={data.received_quantity_this_month}
        icon={<ShoppingCart />}
        accent="text-green-700 bg-green-50"
      />
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumLockedInventoryCard.tsx" \
        "admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumKPIRow.tsx"
git commit -m "feat: PremiumLockedInventoryCard and PremiumKPIRow components"
```

---

## Task 3: `InboundTransactionsList` + `InboundTransactionDetailDrawer`

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundTransactionsList.tsx`
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundTransactionDetailDrawer.tsx`

- [ ] **Step 1: Create `InboundTransactionDetailDrawer.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundTransactionDetailDrawer.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Drawer from '@/components/ds/Drawer';
import { fetchInboundTransactionAction } from '@/actions/inventory';
import type { InboundTransaction } from '@/types/api';

interface Props {
  id:      string | null;
  onClose: () => void;
}

export default function InboundTransactionDetailDrawer({ id, onClose }: Props) {
  const t = useTranslations('inventory');
  const [txn,     setTxn]     = useState<InboundTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setTxn(null); return; }
    let ignored = false;
    setLoading(true);
    setError(null);
    fetchInboundTransactionAction(id).then(res => {
      if (ignored) return;
      if (res.ok) setTxn(res.data);
      else        setError(res.error);
      setLoading(false);
    });
    return () => { ignored = true; };
  }, [id]);

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={t('inboundList.drawerTitle')}
      subtitle={txn?.reference}
    >
      {loading && <div className="h-40 rounded-xl bg-muted animate-pulse m-5" />}
      {error   && <p className="text-xs text-destructive p-5">{error}</p>}
      {txn && (
        <div className="p-5 space-y-5">
          {/* Header meta */}
          <div className="space-y-2">
            {txn.vendor && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{t('inboundList.vendor')}</span>
                <span className="text-xs font-semibold">
                  {txn.vendor.name}{txn.vendor.phone ? ` · ${txn.vendor.phone}` : ''}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{t('inbound.shop')}</span>
              <span className="text-xs font-semibold">{txn.shop_name}</span>
            </div>
            {txn.notes && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{t('inboundList.notes')}</span>
                <span className="text-xs">{txn.notes}</span>
              </div>
            )}
            {txn.created_by_name && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{t('inboundList.createdBy')}</span>
                <span className="text-xs">{txn.created_by_name}</span>
              </div>
            )}
          </div>

          {/* Items table */}
          <div>
            <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">
              {t('inboundList.items')}
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                {[
                  t('inboundList.colProduct'),
                  t('inbound.quantity'),
                  t('inboundList.colUnitCost'),
                  t('inboundList.colExpiry'),
                  t('inboundList.colBatch'),
                ].map((h, i) => (
                  <span key={i} className="text-[10px] font-semibold text-muted-foreground">{h}</span>
                ))}
              </div>
              {txn.items.map(item => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2.5 border-b border-border last:border-0"
                >
                  <span className="text-[12px] font-medium truncate">{item.product_name}</span>
                  <span className="text-[12px] text-muted-foreground">{item.quantity}</span>
                  <span className="text-[12px] text-muted-foreground">{item.unit_cost ?? '—'}</span>
                  <span className="text-[12px] text-muted-foreground">{item.expiry_date ?? '—'}</span>
                  <span className="text-[12px] text-muted-foreground">{item.batch_number || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
```

- [ ] **Step 2: Create `InboundTransactionsList.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundTransactionsList.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { fetchInboundListAction } from '@/actions/inventory';
import type { InboundTransaction } from '@/types/api';
import InboundTransactionDetailDrawer from './InboundTransactionDetailDrawer';

export default function InboundTransactionsList() {
  const t = useTranslations('inventory');
  const [transactions, setTransactions] = useState<InboundTransaction[]>([]);
  const [page,        setPage]          = useState(1);
  const [total,       setTotal]         = useState(0);
  const [loading,     setLoading]       = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [error,       setError]         = useState<string | null>(null);
  const [selectedId,  setSelectedId]    = useState<string | null>(null);

  async function load(p: number, append = false) {
    if (p === 1) setLoading(true);
    else         setLoadingMore(true);
    setError(null);

    const res = await fetchInboundListAction({ page: p });
    if (res.ok) {
      setTransactions(prev => append ? [...prev, ...res.data] : res.data);
      setTotal(res.count);
    } else {
      setError(res.error);
    }

    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = transactions.length < total;

  function loadMore() {
    const next = page + 1;
    setPage(next);
    load(next, true);
  }

  if (loading) {
    return <div className="h-24 rounded-xl bg-muted animate-pulse mt-5" />;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 mt-5">
        <AlertCircle size={14} className="text-destructive shrink-0" />
        <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
        <button
          type="button"
          onClick={() => load(1)}
          className="text-xs text-primary hover:underline"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-8 mt-5">
        {t('inboundList.empty')}
      </p>
    );
  }

  return (
    <div className="mt-5">
      <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">
        {t('inboundList.title')}
      </p>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_3rem_5rem_5rem] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
          {[
            t('inboundList.colReference'),
            t('inboundList.colVendor'),
            t('inboundList.colShop'),
            t('inboundList.colItems'),
            t('inboundList.colQty'),
            t('inboundList.colDate'),
          ].map((h, i) => (
            <span key={i} className="text-[11px] font-semibold text-muted-foreground">{h}</span>
          ))}
        </div>

        {/* Data rows */}
        {transactions.map(txn => (
          <button
            key={txn.id}
            type="button"
            onClick={() => setSelectedId(txn.id)}
            className="w-full grid grid-cols-[1.5fr_1fr_1fr_3rem_5rem_5rem] gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors text-left items-center"
          >
            <span className="text-[13px] font-semibold text-foreground truncate">{txn.reference}</span>
            <span className="text-[12px] text-muted-foreground truncate">{txn.vendor?.name ?? '—'}</span>
            <span className="text-[12px] text-muted-foreground truncate">{txn.shop_name}</span>
            <span className="text-[12px] text-muted-foreground">{txn.item_count}</span>
            <span className="text-[12px] text-muted-foreground">{txn.total_quantity}</span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(txn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-3 w-full py-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {loadingMore ? '…' : t('inboundList.loadMore')}
        </button>
      )}

      <InboundTransactionDetailDrawer
        id={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/InboundTransactionsList.tsx" \
        "admin/src/app/[locale]/(dashboard)/inventory/_components/InboundTransactionDetailDrawer.tsx"
git commit -m "feat: InboundTransactionsList and InboundTransactionDetailDrawer"
```

---

## Task 4: `VendorsList` + `VendorDrawer`

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/VendorDrawer.tsx`
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/VendorsList.tsx`

- [ ] **Step 1: Create `VendorDrawer.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/VendorDrawer.tsx`:

```tsx
'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Drawer from '@/components/ds/Drawer';
import {
  createVendorAction,
  updateVendorAction,
  type VendorFormState,
} from '@/actions/inventory';
import type { Vendor } from '@/types/api';

interface Props {
  open:      boolean;
  vendor:    Vendor | null;
  onClose:   () => void;
  onSuccess: (vendor: Vendor) => void;
}

export default function VendorDrawer({ open, vendor, onClose, onSuccess }: Props) {
  const t = useTranslations('inventory');
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={vendor ? t('vendors.editVendor') : t('vendors.addVendor')}
    >
      {open && (
        <VendorForm
          key={vendor?.id ?? 'new'}
          vendor={vendor}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  );
}

function VendorForm({
  vendor,
  onClose,
  onSuccess,
}: {
  vendor:    Vendor | null;
  onClose:   () => void;
  onSuccess: (v: Vendor) => void;
}) {
  const t = useTranslations('inventory');
  const action = vendor ? updateVendorAction : createVendorAction;

  const [state, dispatch, isPending] = useActionState<VendorFormState, FormData>(action, null);

  useEffect(() => {
    if (state && 'success' in state) onSuccess(state.vendor);
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <form action={dispatch} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3">
            <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-destructive leading-relaxed">{error}</p>
          </div>
        )}

        {vendor && <input type="hidden" name="id" value={vendor.id} />}

        <Input
          label={t('vendors.name')}
          name="name"
          required
          defaultValue={vendor?.name ?? ''}
          placeholder={t('vendors.namePlaceholder')}
        />
        <Input
          label={t('vendors.phone')}
          name="phone"
          type="tel"
          defaultValue={vendor?.phone ?? ''}
        />
        <Input
          label={t('vendors.email')}
          name="email"
          type="email"
          defaultValue={vendor?.email ?? ''}
        />
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">
            {t('vendors.address')}
          </label>
          <textarea
            name="address"
            rows={2}
            defaultValue={vendor?.address ?? ''}
            className="flex w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">
            {t('vendors.notes')}
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={vendor?.notes ?? ''}
            className="flex w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors resize-none"
          />
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
        <Button variant="secondary" size="sm" type="button" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? t('vendors.saving') : t('vendors.save')}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `VendorsList.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/VendorsList.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Mail, Phone, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  deactivateVendorAction,
  fetchVendorsManagementAction,
  reactivateVendorAction,
} from '@/actions/inventory';
import type { Vendor } from '@/types/api';
import VendorDrawer from './VendorDrawer';

export default function VendorsList() {
  const t = useTranslations('inventory');
  const [vendors,     setVendors]     = useState<Vendor[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [rawSearch,   setRawSearch]   = useState('');
  const [search,      setSearch]      = useState('');
  const [showAll,     setShowAll]     = useState(false);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editing,     setEditing]     = useState<Vendor | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchVendorsManagementAction({ search, showAll });
    if (res.ok) setVendors(res.data);
    else        setError(res.error);
    setLoading(false);
  }, [search, showAll]);

  useEffect(() => { load(); }, [load]);

  function handleSearchChange(val: string) {
    setRawSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 300);
  }

  function openAdd()        { setEditing(null);   setDrawerOpen(true); }
  function openEdit(v: Vendor) { setEditing(v);   setDrawerOpen(true); }
  function closeDrawer()    { setDrawerOpen(false); }

  function handleSaved(saved: Vendor) {
    setDrawerOpen(false);
    setVendors(prev => {
      const exists = prev.find(v => v.id === saved.id);
      return exists
        ? prev.map(v => v.id === saved.id ? saved : v)
        : [saved, ...prev];
    });
  }

  async function handleDeactivate(id: string) {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, is_active: false } : v));
    const res = await deactivateVendorAction(id);
    if (!res.ok) load();
  }

  async function handleReactivate(id: string) {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, is_active: true } : v));
    const res = await reactivateVendorAction(id);
    if (!res.ok) load();
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={rawSearch}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder={t('vendors.searchPlaceholder')}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        />
        <button
          type="button"
          onClick={() => setShowAll(p => !p)}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-semibold border transition-colors shrink-0',
            showAll
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-muted-foreground border-border hover:text-foreground',
          )}
        >
          {showAll ? t('vendors.activeOnly') : t('vendors.showAll')}
        </button>
        <Button size="sm" onClick={openAdd} className="shrink-0">
          <Plus size={14} />
          {t('vendors.addVendor')}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[60px] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
          <button type="button" onClick={load} className="text-xs text-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      ) : vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">
          {rawSearch ? t('vendors.emptySearch') : t('vendors.empty')}
        </p>
      ) : (
        <div className="space-y-2">
          {vendors.map(vendor => (
            <div
              key={vendor.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-opacity',
                !vendor.is_active && 'opacity-50',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground truncate">{vendor.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {vendor.phone && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone size={10} />{vendor.phone}
                    </span>
                  )}
                  {vendor.email && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Mail size={10} />{vendor.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  vendor.is_active
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {vendor.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(vendor)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  {t('common.edit')}
                </button>
                {vendor.is_active ? (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(vendor.id)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {t('vendors.deactivate')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReactivate(vendor.id)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('vendors.reactivate')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <VendorDrawer
        open={drawerOpen}
        vendor={editing}
        onClose={closeDrawer}
        onSuccess={handleSaved}
      />
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/VendorDrawer.tsx" \
        "admin/src/app/[locale]/(dashboard)/inventory/_components/VendorsList.tsx"
git commit -m "feat: VendorsList and VendorDrawer components"
```

---

## Task 5: `PremiumInventoryShell` + `page.tsx` integration

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx`
- Modify: `admin/src/app/[locale]/(dashboard)/inventory/page.tsx`

- [ ] **Step 1: Create `PremiumInventoryShell.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import PremiumKPIRow from './PremiumKPIRow';
import InboundReceivingPanel from './InboundReceivingPanel';
import InboundTransactionsList from './InboundTransactionsList';
import VendorsList from './VendorsList';
import type { PremiumInventorySummary, Shop } from '@/types/api';

type Tab = 'stock' | 'inbound' | 'vendors';

interface Props {
  summary:  PremiumInventorySummary | null;
  shops:    Shop[];
  children: React.ReactNode; // Stock tab content: InventoryStats + InventoryFilters + InventoryTable
}

export default function PremiumInventoryShell({ summary, shops, children }: Props) {
  const t = useTranslations('inventory');
  const [activeTab, setActiveTab] = useState<Tab>('stock');
  const [visited,   setVisited]   = useState<Set<Tab>>(new Set(['stock']));

  const TABS: { id: Tab; label: string }[] = [
    { id: 'stock',   label: t('premium.tabStock') },
    { id: 'inbound', label: t('premium.tabInbound') },
    { id: 'vendors', label: t('premium.tabVendors') },
  ];

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setVisited(prev => { const s = new Set(prev); s.add(tab); return s; });
  }

  return (
    <div>
      {/* KPI row — only when summary data is available */}
      {summary && <PremiumKPIRow data={summary} />}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock tab — always mounted (server-rendered children) */}
      <div className={cn(activeTab !== 'stock' && 'hidden')}>
        {children}
      </div>

      {/* Inbound tab — lazy: mount on first visit, stay mounted */}
      {visited.has('inbound') && (
        <div className={cn(activeTab !== 'inbound' && 'hidden')}>
          <InboundReceivingPanel enabled={true} shops={shops} />
          <InboundTransactionsList />
        </div>
      )}

      {/* Vendors tab — lazy: mount on first visit, stay mounted */}
      {visited.has('vendors') && (
        <div className={cn(activeTab !== 'vendors' && 'hidden')}>
          <VendorsList />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `inventory/page.tsx`**

Replace the full contents of `admin/src/app/[locale]/(dashboard)/inventory/page.tsx` with:

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
import PremiumInventoryShell from './_components/PremiumInventoryShell';
import PremiumLockedInventoryCard from './_components/PremiumLockedInventoryCard';
import { fetchBusiness, fetchUserProfile } from '@/services/owner';
import { fetchPremiumSummaryAction } from '@/actions/inventory';

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

  const summaryRes = isInboundEnabled ? await fetchPremiumSummaryAction() : null;
  const summary    = summaryRes?.ok ? summaryRes.data : null;

  const stockContent = (
    <>
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
    </>
  );

  return (
    <InventoryDrawerShell>
      <InventoryPageHeader />

      {isInboundEnabled ? (
        <PremiumInventoryShell summary={summary} shops={shops}>
          {stockContent}
        </PremiumInventoryShell>
      ) : (
        <>
          <PremiumLockedInventoryCard />
          {stockContent}
        </>
      )}
    </InventoryDrawerShell>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: zero new errors.

- [ ] **Step 4: Start the dev server and test manually**

```bash
# Terminal 1: backend
docker compose up app

# Terminal 2: frontend
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npm run dev
```

Open `http://localhost:3001/en/inventory` as an owner.

**Feature disabled (no `inventory_inbound_receiving` on plan):**
- Amber shimmer locked card renders above the basic stock table
- Existing stock stats, filters, and table work normally

**Feature enabled:**
- 8 KPI cards render at top (real data from `premium-summary/`)
- Tab bar shows: Stock | Inbound | Vendors
- Stock tab shows existing stats/filters/table — switching back from other tabs restores instantly (no re-fetch)
- Inbound tab: "Receive Stock" amber bar + paginated inbound transactions list loads on first visit
- Inbound tab: clicking a row opens the detail drawer with items table
- After recording an inbound transaction, the list refreshes
- Vendors tab: card list loads on first visit; search debounces; Show all toggle works
- "Add Vendor" opens drawer; filling form + saving creates vendor and updates list
- "Edit" opens drawer pre-filled; saving updates card in list
- "Deactivate" dims card immediately (optimistic); "Re-activate" undims

- [ ] **Step 5: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx" \
        "admin/src/app/[locale]/(dashboard)/inventory/page.tsx"
git commit -m "feat: PremiumInventoryShell tab navigation and page.tsx integration"
```

---

## Self-Review

### 1. Spec coverage

| Requirement | Task |
|---|---|
| Feature disabled → amber locked card above basic stock table | Task 5 (page.tsx conditional) + Task 2 (PremiumLockedInventoryCard) |
| Feature enabled → 8 KPI cards | Task 2 (PremiumKPIRow) + Task 5 (page.tsx fetches summary) |
| 3 tabs: Stock, Inbound, Vendors | Task 5 (PremiumInventoryShell) |
| Tab switching is instant (client-side) | Task 5 — `useState` + CSS `hidden` |
| Lazy tab mounting (data fetched on first activation only) | Task 5 — `visited` Set pattern |
| Stock tab = existing components unchanged | Task 5 — passed as `children` |
| Inbound tab: InboundReceivingPanel + transactions list | Task 3 + Task 5 |
| Transactions list paginated with "load more" | Task 3 (InboundTransactionsList) |
| Row click → detail drawer with items | Task 3 (InboundTransactionDetailDrawer) |
| Vendors tab: card list, search, active toggle | Task 4 (VendorsList) |
| Add/Edit → Drawer form with `useActionState` | Task 4 (VendorDrawer) |
| Deactivate/Re-activate optimistic update | Task 4 (VendorsList) |
| All text i18n-keyed (en + ar) | Task 1 |
| 6 new server actions for vendor mutations + list | Task 1 |

### 2. Placeholder scan

None found.

### 3. Type consistency

- `VendorFormState` defined in Task 1, used in Task 4 (`VendorDrawer`). ✅
- `InboundListResult` defined in Task 1, used in Task 3 (`InboundTransactionsList`). ✅
- `VendorsManagementParams` defined in Task 1, used in Task 4 (`VendorsList`). ✅
- `PremiumInventorySummary` (from SP1 types) used in Task 2 (`PremiumKPIRow`) and Task 5 (`page.tsx`). ✅
- `InboundTransaction.vendor` is `VendorMinimal | null` — handled in Task 3 with `txn.vendor?.name ?? '—'`. ✅
- `shops` typed as `Shop[]` from `bizRes?.data?.[0]?.shops ?? []` — passed to `PremiumInventoryShell` which passes to `InboundReceivingPanel`. ✅
