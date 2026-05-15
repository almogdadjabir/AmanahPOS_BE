# AmanaPOS — Admin Dashboard

Next.js 15.3.1 · React 19 · TypeScript · Tailwind CSS · next-intl

Located at `admin/` — runs on port **3001** in development, served through Nginx in production.

---

## Table of Contents

- [Purpose](#purpose)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Authentication Flow](#authentication-flow)
- [Data Fetching](#data-fetching)
- [Services Layer](#services-layer)
- [Actions Layer](#actions-layer)
- [Premium Feature Flags](#premium-feature-flags)
- [Components](#components)
- [Internationalisation](#internationalisation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Build & Production](#build--production)

---

## Purpose

The admin dashboard is used exclusively by **platform super-admins** (`is_staff=True`) and **business owners** (`role=owner`). It provides:

- Platform-wide overview: total revenue, total sales, active businesses, user counts
- Owner account management: create, view, update owner accounts
- Business management: browse and manage all businesses across tenants
- Customer, product, inventory, and sales inspection per business
- Subscription management: assign and inspect subscription plans
- Premium feature toggling per plan (e.g. inventory inbound receiving)
- User (staff) management within a business
- System settings and configuration

---

## Tech Stack

| Dependency | Version | Purpose |
|---|---|---|
| `next` | 15.3.1 | App Router, SSR, server actions |
| `react` | 19 | UI framework (`useActionState` for forms) |
| `typescript` | 5 | Type safety |
| `tailwindcss` | 3.4.17 | Utility-first CSS |
| `next-intl` | 3.26.3 | Internationalisation (`[locale]` routing) |
| `recharts` | 3.8.1 | Charts and data visualisation |

---

## Project Structure

```
admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root HTML shell
│   │   ├── api/
│   │   │   └── auth/                # Next.js API route for auth callbacks
│   │   └── [locale]/
│   │       ├── layout.tsx           # Locale provider wrapper
│   │       ├── login/
│   │       │   └── page.tsx         # Login page (password auth)
│   │       └── (dashboard)/         # Protected route group
│   │           ├── layout.tsx       # Dashboard shell (sidebar, header)
│   │           ├── page.tsx         # Dashboard home / overview
│   │           ├── _overview/       # Shared overview components and data
│   │           ├── owners/          # Owner management
│   │           ├── businesses/      # Business listing and detail drawer
│   │           ├── customers/       # Customer management
│   │           ├── products/        # Product catalog
│   │           ├── sales/           # Sales history
│   │           ├── inventory/       # Stock levels + inbound receiving
│   │           ├── users/           # Staff user management
│   │           ├── subscriptions/   # Subscription plan management
│   │           ├── subscription/    # Single subscription detail
│   │           └── system/          # System settings
│   │
│   ├── services/                    # Server-side typed fetch helpers
│   │   ├── admin.ts                 # Admin-scoped API calls (owners, businesses, plans)
│   │   ├── auth.ts                  # Login, logout, token management
│   │   ├── overview.ts              # Platform-wide stats API calls
│   │   ├── owner.ts                 # Owner-facing data (sales, inventory, profile)
│   │   └── users.ts                 # Staff user API calls
│   │
│   ├── actions/                     # Next.js server actions (mutations)
│   │   ├── businesses.ts            # Business CRUD + premium feature toggle
│   │   ├── inventory.ts             # Stock adjustment, inbound receiving
│   │   ├── owners.ts                # Owner create / update
│   │   └── ...
│   │
│   ├── components/                  # Reusable React components
│   ├── lib/                         # Utilities (HTTP client, cache helpers, etc.)
│   ├── types/                       # TypeScript interfaces and types
│   │   └── api.ts                   # All API response shapes
│   ├── i18n/                        # next-intl configuration
│   ├── messages/                    # Translation JSON files (en.json, ar.json)
│   ├── styles/                      # Global Tailwind CSS overrides
│   └── middleware.ts                # Locale detection + auth redirect
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Pages & Routes

All routes are prefixed with a locale segment: `/{locale}/...`

| Route | Page | Description |
|---|---|---|
| `/{locale}/login` | Login | Password-based login for admin/owner access |
| `/{locale}/` | Dashboard home | Overview charts and KPI cards |
| `/{locale}/owners` | Owner list | All owner accounts, filterable and searchable |
| `/{locale}/owners/[id]` | Owner detail | Owner profile, their businesses, subscription |
| `/{locale}/businesses` | Business list | All businesses across all tenants |
| `/{locale}/customers` | Customers | Customer list with loyalty points |
| `/{locale}/products` | Products | Product catalog across tenants |
| `/{locale}/sales` | Sales | Transaction history with filters |
| `/{locale}/inventory` | Inventory | Stock levels by shop; inbound receiving panel (premium) |
| `/{locale}/users` | Users | Staff user accounts |
| `/{locale}/subscriptions` | Subscriptions | Subscription plan management |
| `/{locale}/subscription/[id]` | Subscription detail | Single subscription view |
| `/{locale}/system` | System | Platform configuration |

---

## Authentication Flow

The dashboard uses **password-based authentication** (not OTP — OTP is for mobile clients).

```
User visits /{locale}/
      │
      ▼
middleware.ts → check for valid session/JWT cookie
      │
      ├── No token → redirect to /{locale}/login
      │
      └── Token present → render (dashboard)/layout.tsx
```

Login form submits to `services/auth.ts → loginWithPassword()` which calls:

```
POST /api-public/v1/auth/login/password/
  Body: { phone/email, password }
  Returns: { access, refresh }
```

Tokens are stored as HTTP-only cookies. All API calls attach `Authorization: Bearer <access>`. Token refresh is handled via `/api-public/v1/auth/token/refresh/`.

---

## Data Fetching

The dashboard uses **Next.js App Router** patterns:

- **Server Components** — initial page data fetches (no loading state, SEO-friendly)
- **Server Actions** (`actions/`) — all mutations: create owner, update business, record inbound stock, etc.
- **Client Components** — interactive elements: tables with sorting, modals, drawers, charts

**Caching:** Server-side fetches use `withUserCache()` (from `lib/serverCache.ts`) which wraps `fetch` with per-user cache tags and TTLs. Expensive per-request fetches (e.g. `fetchBusiness`) are additionally wrapped in React's `cache()` to deduplicate within a single render tree.

```tsx
// Server component — owner inventory page
export default async function InventoryPage() {
  const [bizRes, profileRes] = await Promise.all([fetchBusiness(), fetchUserProfile()]);
  const isInboundEnabled = Boolean(profileRes?.data?.enabled_features?.inventory_inbound_receiving);
  return <InboundReceivingPanel enabled={isInboundEnabled} shops={bizRes?.data?.[0]?.shops ?? []} />;
}
```

```tsx
// Server action — record inbound stock
'use server';
export async function createInboundTransactionAction(_prev: InboundState, formData: FormData): Promise<InboundState> {
  // validates → POST /api/v1/inventory/inbound/ → revalidatePath
}
```

---

## Services Layer

Services in `src/services/` are typed async functions that wrap API calls. They are called from server components and server actions only (never from client components directly).

| File | Key exports | Backend endpoints |
|---|---|---|
| `auth.ts` | `loginWithPassword`, `logout`, `refreshToken` | `/api-public/v1/auth/login/password/`, `token/refresh/`, `logout/` |
| `admin.ts` | `fetchOwners`, `fetchOwner`, `createOwner`, `fetchBusinesses`, `fetchBusinessDetail`, `fetchSubscriptions`, `fetchPlans` | `/api/v1/admin/owners/`, `businesses/`, `plans/` |
| `overview.ts` | `fetchDashboardStats` | `/api/v1/admin/stats/` |
| `owner.ts` | `fetchBusiness`, `fetchUserProfile`, `fetchTodaySummary`, `fetchMonthSummary`, `fetchChartSales`, `fetchLowStock`, `fetchSubscription`, `fetchOwnerDashboard` | `/api/v1/tenants/businesses/`, `accounts/profile/`, `sales/summary/`, `inventory/stock/`, `subscriptions/current/` |
| `users.ts` | `fetchUsers`, `createUser` | `/api/v1/users/` |

**URL resolution:** Services use `INTERNAL_API_URL` (server-to-server, faster) falling back to `NEXT_PUBLIC_API_URL`.

---

## Actions Layer

Server actions in `src/actions/` handle all mutations. They validate input, call the backend, and call `revalidatePath` / `revalidateTag` to invalidate the Next.js cache.

| File | Key exports |
|---|---|
| `businesses.ts` | `createBusinessAction`, `updateBusinessAction`, `toggleBusinessStatusAction`, `fetchBusinessDetailAction`, `fetchBusinessFeaturesAction`, `updateBusinessFeatureAction` |
| `inventory.ts` | `fetchStockLevelsAction`, `fetchMovementsAction`, `stockAdjustmentAction`, `fetchProductsForShopAction`, `createInboundTransactionAction` |
| `owners.ts` | `createOwnerAction`, `updateOwnerAction` |

**HTTP client:** Mutations use `devFetch` (from `lib/dev-logger`) which logs requests in development. Read-only fetches inside actions use plain `fetch` with `cache: 'no-store'`.

**Form state:** All forms use React 19's `useActionState(action, null)` — no form library.

---

## Premium Feature Flags

Features gated behind a subscription plan are stored as a JSON dict on the `Plan` model:

```python
# Plan.features (JSONField)
{ "inventory_inbound_receiving": true }
```

**Admin side:** The business detail drawer (`BusinessesDrawerShell.tsx`) shows a "Premium Features" section for shop-type businesses with an active subscription. Admins toggle features on/off — this PATCHes the plan's `features` field, which affects **all businesses on that plan**.

**Owner side:** The owner's `/inventory` page reads `UserProfile.enabled_features` (the backend copies active plan features onto the profile). If `inventory_inbound_receiving` is `false`, a locked amber card is shown. If `true`, a "Receive Stock" button opens the inbound receiving drawer.

---

## Components

Components live in `src/components/`. Organised by domain and shared UI primitives:

**UI primitives (`components/ui/`, `components/ds/`):**
- `Button`, `Input`, `Select`, `Badge` — form elements
- `Drawer` — side-panel overlay used for detail views and forms
- `Table`, `Pagination` — data display
- `Card`, `StatCard` — KPI and summary cards

**Domain components (co-located with pages in `_components/`):**
- `BusinessesDrawerShell` — business detail drawer with premium feature toggles
- `InventoryDrawerShell` — inventory page drawer context
- `InboundReceivingPanel` — premium-gated inbound stock form
- `StockAdjustDrawer` — stock add/remove/set form
- `FeatureToggleRow` — toggle switch for plan-level features

**Layout components:**
- `Sidebar` — navigation with role-based menu items
- `Header` — top bar with user menu and locale switcher

---

## Internationalisation

The dashboard supports multiple locales via `next-intl` with `[locale]` dynamic routing.

**Supported locales:** English (`en`), Arabic (`ar`)  
**Default locale:** `en`

**Setup:**
```
src/
  i18n/
    config.ts          # locales list, defaultLocale
  messages/
    en.json            # English strings
    ar.json            # Arabic strings
  middleware.ts        # Detects locale from URL, cookie, or Accept-Language header
```

**Usage in components:**
```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('inventory');
<p>{t('inbound.sectionTitle')}</p>
```

**RTL support:** Arabic locale triggers `dir="rtl"` on the HTML element via the locale layout.

---

## Environment Variables

Set in `admin/.env.local` for development, or injected via Docker / compose env in production.

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend API base URL (baked into client bundle) |
| `INTERNAL_API_URL` | `http://backend:8000` | Server-to-server API URL (faster; used in server actions and services) |
| `NEXT_PUBLIC_APP_NAME` | `AmanaPOS` | Displayed in page titles |

`INTERNAL_API_URL` takes precedence over `NEXT_PUBLIC_API_URL` in server-side code. If unset, server-side calls fall back to `NEXT_PUBLIC_API_URL`.

---

## Running Locally

```bash
cd admin
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev                         # starts on http://localhost:3001
```

Or via Docker:
```bash
make up    # starts all services including admin at localhost:3001 (via Nginx on 8080)
```

---

## Build & Production

```bash
npm run build      # Next.js static + SSR build
npm run start      # Start production server on port 3001
npm run lint       # ESLint check
npx tsc --noEmit   # Type check without emitting
```

In production the admin container is built with `NEXT_PUBLIC_API_URL` and `INTERNAL_API_URL` injected as Docker build args. The Nginx reverse proxy serves the dashboard and proxies API calls to the Django backend.
