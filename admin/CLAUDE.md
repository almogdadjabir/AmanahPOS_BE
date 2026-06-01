# AmanaPOS — Admin Dashboard Claude Code Instructions

> Applies to everything inside `admin/`. Read the root `CLAUDE.md` first, then this file.

---

## What This Is

The admin dashboard is a **Next.js 15 App Router** app used by:

- **Platform super-admins** (`is_staff=True`) — manage all owners, businesses, plans
- **Business owners** (`role=owner`) — manage their own business, inventory, sales, staff

Runs on port **3001** in dev. Served through Nginx in production.

---

## Tech Stack

| Dep           | Version | Purpose                                 |
| ------------- | ------- | --------------------------------------- |
| `next`        | 15.3.1  | App Router, SSR, server actions         |
| `react`       | 19      | UI, `useActionState` for forms          |
| `typescript`  | 5       | Type safety — use it strictly           |
| `tailwindcss` | 3.4.17  | Utility-first CSS                       |
| `next-intl`   | 3.26.3  | i18n — all strings must go through this |
| `recharts`    | 3.8.1   | Charts only                             |

---

## Project Structure

```
admin/src/
├── app/
│   ├── api/auth/           # Token refresh proxy (Next.js API route)
│   └── [locale]/
│       ├── login/          # Password login page
│       └── (dashboard)/    # Protected route group
│           ├── layout.tsx  # Dashboard shell (sidebar + header)
│           ├── page.tsx    # Dashboard home
│           ├── owners/
│           ├── businesses/
│           ├── customers/
│           ├── products/
│           ├── sales/
│           ├── inventory/
│           ├── users/
│           ├── subscriptions/
│           └── system/
├── services/               # Server-side fetch helpers (READ operations)
├── actions/                # Server actions (WRITE operations / mutations)
├── components/             # Reusable React components
│   ├── ui/                 # Primitives: Button, Input, Select, Badge, etc.
│   ├── ds/                 # Design system components
│   └── {domain}/           # Domain components co-located with pages
├── lib/                    # HTTP client, cache helpers, utilities
├── types/
│   └── api.ts              # ALL API response types live here
├── i18n/                   # next-intl config
└── messages/
    ├── en.json             # English strings
    └── ar.json             # Arabic strings
```

---

## The Data Flow Pattern — Memorise This

```
Page (server component)
  │  calls services/ functions to fetch initial data
  │
  ▼
Server Component renders with data
  │  passes data + server actions to client components
  │
  ▼
Client Component (interactive UI)
  │  user triggers mutation
  │
  ▼
Server Action (actions/)
  │  validates → calls backend API → revalidates cache
  │
  ▼
Backend Django API
```

**Never fetch data directly from a client component.** All fetching goes through server components or server actions.

---

## Services Layer (src/services/) — Read Operations Only

Services are typed async functions that wrap `fetch` calls. **Called from server components and server actions only — never from client components.**

```typescript
// src/services/owner.ts
export async function fetchBusiness(): Promise<ApiResponse<Business[]>> {
  const url = `${getApiUrl()}/api/v1/tenants/businesses/`;
  const res = await fetch(url, {
    headers: await getAuthHeaders(),
    next: { tags: ["businesses"] },
  });
  return res.json();
}
```

### Existing services — use these, don't duplicate

| File                   | Key exports                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `services/auth.ts`     | `loginWithPassword`, `logout`, `refreshToken`                                                                                          |
| `services/admin.ts`    | `fetchOwners`, `fetchOwner`, `createOwner`, `fetchBusinesses`, `fetchBusinessDetail`, `fetchSubscriptions`, `fetchPlans`               |
| `services/overview.ts` | `fetchDashboardStats`                                                                                                                  |
| `services/owner.ts`    | `fetchBusiness`, `fetchUserProfile`, `fetchTodaySummary`, `fetchMonthSummary`, `fetchChartSales`, `fetchLowStock`, `fetchSubscription` |
| `services/users.ts`    | `fetchUsers`, `createUser`                                                                                                             |

### URL resolution

```typescript
// Server-side (faster, internal Docker network):
const apiUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL;

// Client-side (baked into bundle):
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

Always prefer `INTERNAL_API_URL` in server-side code.

---

## Actions Layer (src/actions/) — Mutations Only

Server actions handle all mutations. They must:

1. Start with `'use server'`
2. Validate input
3. Call the backend API
4. Call `revalidatePath()` or `revalidateTag()` to bust the cache
5. Return a typed state object (never throw — return errors in state)

```typescript
// src/actions/inventory.ts
"use server";

import { revalidatePath } from "next/cache";

export interface InboundState {
  success: boolean;
  error?: string;
  data?: InboundTransaction;
}

export async function createInboundTransactionAction(
  _prev: InboundState,
  formData: FormData,
): Promise<InboundState> {
  const token = await getServerToken();

  const payload = {
    shop: formData.get("shop"),
    reference: formData.get("reference"),
    items: JSON.parse(formData.get("items") as string),
  };

  const res = await fetch(`${getInternalApiUrl()}/api/v1/inventory/inbound/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json();
    return {
      success: false,
      error: err.error?.message ?? "Something went wrong",
    };
  }

  revalidatePath("/inventory"); // bust the Next.js cache
  return { success: true, data: await res.json() };
}
```

### Existing actions — check before creating new ones

| File                    | Key exports                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `actions/businesses.ts` | `createBusinessAction`, `updateBusinessAction`, `toggleBusinessStatusAction`, `updateBusinessFeatureAction` |
| `actions/inventory.ts`  | `fetchStockLevelsAction`, `stockAdjustmentAction`, `createInboundTransactionAction`                         |
| `actions/owners.ts`     | `createOwnerAction`, `updateOwnerAction`                                                                    |

---

## Forms — React 19 Pattern

**Never use HTML `<form>` tags. Never use form libraries (react-hook-form, formik, etc.)**

All forms use React 19's `useActionState`:

```typescript
'use client';

import { useActionState } from 'react';
import { createInboundTransactionAction } from '@/actions/inventory';

export function InboundForm({ shops }: { shops: Shop[] }) {
  const [state, formAction, isPending] = useActionState(
    createInboundTransactionAction,
    null
  );

  return (
    <div>
      {state?.error && <p className="text-red-500">{state.error}</p>}

      <Select
        value={selectedShop}
        onChange={(e) => setSelectedShop(e.target.value)}
      />

      <Button
        onClick={() => {
          const formData = new FormData();
          formData.set('shop', selectedShop);
          formData.set('items', JSON.stringify(items));
          formAction(formData);
        }}
        disabled={isPending}
      >
        {isPending ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
```

---

## Server Components vs Client Components

| Use Server Component            | Use Client Component                       |
| ------------------------------- | ------------------------------------------ |
| Page-level data fetching        | Interactivity (modals, drawers, tabs)      |
| Initial render with data        | Forms and inputs                           |
| SEO-important content           | Charts (recharts needs browser)            |
| Anything that calls `services/` | Anything that uses `useState`, `useEffect` |

Mark client components explicitly:

```typescript
"use client"; // must be first line
```

### Composing them correctly

```typescript
// app/[locale]/(dashboard)/inventory/page.tsx — SERVER component
export default async function InventoryPage() {
  const [bizRes, profileRes] = await Promise.all([
    fetchBusiness(),
    fetchUserProfile(),
  ]);

  const isInboundEnabled = Boolean(
    profileRes?.data?.enabled_features?.inventory_inbound_receiving
  );

  // pass data DOWN to client components — never fetch in client components
  return (
    <InboundReceivingPanel
      enabled={isInboundEnabled}
      shops={bizRes?.data?.[0]?.shops ?? []}
    />
  );
}
```

---

## Caching

```typescript
// Cached server fetch (use for data that doesn't change per request):
const res = await fetch(url, {
  headers: await getAuthHeaders(),
  next: { tags: ["businesses"], revalidate: 60 }, // 60s TTL
});

// No cache (use inside server actions or for real-time data):
const res = await fetch(url, {
  headers: await getAuthHeaders(),
  cache: "no-store",
});
```

After any mutation, invalidate the right cache:

```typescript
revalidatePath("/inventory"); // invalidate a specific page
revalidateTag("businesses"); // invalidate all fetches tagged 'businesses'
```

---

## TypeScript — Strict Mode

All types live in `src/types/api.ts`. Add new types there, not inline.

```typescript
// types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

export interface Product {
  id: string;       // UUID — always string, never number
  name: string;
  price: string;    // Django DecimalField comes back as string
  tenant: string;
  ...
}
```

**Important:** Django `DecimalField` and `UUIDField` come back as strings in JSON. Type them as `string`, not `number` or a UUID type.

---

## Internationalisation (next-intl)

**Every user-facing string must go through next-intl.** No hardcoded English strings in components.

```typescript
// In any component:
import { useTranslations } from 'next-intl';

export function InventoryPage() {
  const t = useTranslations('inventory');
  return <h1>{t('inbound.sectionTitle')}</h1>;
}
```

Add new strings to **both** `messages/en.json` and `messages/ar.json`.

```json
// messages/en.json
{
  "inventory": {
    "inbound": {
      "sectionTitle": "Receive Stock"
    }
  }
}

// messages/ar.json
{
  "inventory": {
    "inbound": {
      "sectionTitle": "استلام المخزون"
    }
  }
}
```

**Supported locales:** `en` (default), `ar`
**RTL:** Arabic triggers `dir="rtl"` on `<html>` — Tailwind's `rtl:` variants handle mirrored layouts.

All routes are locale-prefixed: `/{locale}/inventory`, `/{locale}/owners`, etc.

---

## Authentication Flow

Password-based only (not OTP — OTP is mobile-only):

```
POST /api-public/v1/auth/login/password/
  Body: { phone, password }
  Returns: { access, refresh }
```

Tokens stored as HTTP-only cookies. Token refresh via `/api/auth/refresh/` (Next.js proxy route at `app/api/auth/refresh/`).

`middleware.ts` protects the dashboard routes — redirects to `/{locale}/login` if no valid token.

---

## Premium Feature Flags

Feature flags live on `Plan.features` (JSONField on the backend):

```json
{ "inventory_inbound_receiving": true }
```

The user's profile response includes their active plan features:

```typescript
const profile = await fetchUserProfile();
const isInboundEnabled = Boolean(
  profile?.data?.enabled_features?.inventory_inbound_receiving,
);
```

**Gating UI for premium features:**

```typescript
if (!isInboundEnabled) {
  return <LockedFeatureCard featureName={t('features.inboundReceiving')} />;
}
return <InboundReceivingPanel shops={shops} />;
```

Admins can toggle features per plan in the business detail drawer (`BusinessesDrawerShell`). This PATCHes `Plan.features` which affects all businesses on that plan.

---

## Component Patterns

### UI primitives — use what exists in `components/ui/`

```
Button, Input, Select, Badge, Drawer, Table, Pagination, Card, StatCard
```

Don't install new UI libraries. Extend existing primitives if needed.

### Drawer pattern (for detail views and forms)

```typescript
import { Drawer } from '@/components/ui/Drawer';

<Drawer open={isOpen} onClose={() => setIsOpen(false)} title="Edit Business">
  <BusinessEditForm business={business} />
</Drawer>
```

### Table pattern

```typescript
import { Table, Pagination } from '@/components/ui';

<Table
  columns={[
    { key: 'name', label: t('table.name') },
    { key: 'status', label: t('table.status') },
  ]}
  data={businesses}
/>
<Pagination count={count} page={page} onPageChange={setPage} />
```

---

## Routing Reference

All routes are `/{locale}/...`:

| Route                     | Component       | Who sees it     |
| ------------------------- | --------------- | --------------- |
| `/{locale}/login`         | Login page      | Anyone (public) |
| `/{locale}/`              | Dashboard home  | owner + admin   |
| `/{locale}/owners`        | Owner list      | admin only      |
| `/{locale}/owners/[id]`   | Owner detail    | admin only      |
| `/{locale}/businesses`    | Business list   | admin only      |
| `/{locale}/customers`     | Customer list   | owner + admin   |
| `/{locale}/products`      | Product catalog | owner + admin   |
| `/{locale}/sales`         | Sales history   | owner + admin   |
| `/{locale}/inventory`     | Stock + inbound | owner + admin   |
| `/{locale}/users`         | Staff accounts  | owner + admin   |
| `/{locale}/subscriptions` | Plans           | admin only      |
| `/{locale}/system`        | Platform config | admin only      |

---

## Environment Variables

```bash
NEXT_PUBLIC_API_URL      # Backend base URL — baked into client bundle
INTERNAL_API_URL         # Server-to-server URL (faster, Docker internal)
NEXT_PUBLIC_APP_NAME     # "AmanaPOS" — used in page titles
```

Use `INTERNAL_API_URL` in server components and server actions.
Use `NEXT_PUBLIC_API_URL` only when you truly need client-side access.

---

## Checklist Before Submitting Any Admin Change

- [ ] New data fetching in a server component (not client component)?
- [ ] Mutations implemented as server actions with `'use server'`?
- [ ] `revalidatePath()` or `revalidateTag()` called after every mutation?
- [ ] No HTML `<form>` tags — using `useActionState` pattern?
- [ ] All strings going through `useTranslations()` — both `en.json` and `ar.json` updated?
- [ ] New types added to `src/types/api.ts`?
- [ ] DecimalField/UUIDField from Django typed as `string` in TypeScript?
- [ ] Used `INTERNAL_API_URL` for server-side fetches?
- [ ] Premium features gated by checking `enabled_features` from profile?
- [ ] RTL considered for new layout components (`rtl:` Tailwind variants)?
