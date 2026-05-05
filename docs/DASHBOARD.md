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
- [Components](#components)
- [Internationalisation](#internationalisation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Build & Production](#build--production)

---

## Purpose

The admin dashboard is used exclusively by **platform super-admins** (users with `is_staff=True`) and **business owners** (role=`owner`). It provides:

- Platform-wide overview: total revenue, total sales, active businesses, user counts
- Owner account management: create, view, update owner accounts
- Business management: browse and manage all businesses across tenants
- Customer, product, inventory, and sales inspection per business
- Subscription management: assign and inspect subscription plans
- User (staff) management within a business
- System settings and configuration

---

## Tech Stack

| Dependency | Version | Purpose |
|---|---|---|
| `next` | 15.3.1 | App Router, SSR, server actions |
| `react` | 19 | UI framework |
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
│   │           ├── businesses/      # Business listing and detail
│   │           ├── customers/       # Customer management
│   │           ├── products/        # Product catalog
│   │           ├── sales/           # Sales history
│   │           ├── inventory/       # Stock levels
│   │           ├── users/           # Staff user management
│   │           ├── subscriptions/   # Subscription plans
│   │           ├── subscription/    # Single subscription detail
│   │           └── system/          # System settings
│   │
│   ├── services/                    # API client functions (typed)
│   │   ├── admin.ts                 # Owners, businesses, subscriptions API calls
│   │   ├── auth.ts                  # Login, logout, token management
│   │   ├── overview.ts              # Dashboard stats API calls
│   │   ├── owner.ts                 # Single owner detail API calls
│   │   └── users.ts                 # Staff user API calls
│   │
│   ├── actions/                     # Next.js server actions
│   ├── components/                  # Reusable React components
│   ├── lib/                         # Utilities (HTTP client, date formatting, etc.)
│   ├── types/                       # TypeScript interfaces and types
│   ├── i18n/                        # next-intl configuration
│   ├── messages/                    # Translation JSON files (en, ar, ...)
│   ├── styles/                      # Global Tailwind CSS overrides
│   └── middleware.ts                # Next.js middleware (locale detection + redirect)
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
| `/{locale}/businesses/[id]` | Business detail | Business info, shops, stats |
| `/{locale}/customers` | Customers | Customer list with loyalty points |
| `/{locale}/products` | Products | Product catalog across tenants |
| `/{locale}/sales` | Sales | Transaction history with filters |
| `/{locale}/inventory` | Inventory | Stock levels by shop |
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

Tokens are stored in a secure HTTP-only cookie (or localStorage depending on implementation). All subsequent API calls attach `Authorization: Bearer <access>`.

Token refresh is handled transparently via the refresh endpoint (`/api-public/v1/auth/token/refresh/`).

---

## Data Fetching

The dashboard uses **Next.js App Router** patterns:

- **Server Components** — used for initial page data fetches (no client-side loading state, SEO-friendly)
- **Server Actions** (`actions/`) — used for mutations: create owner, update business, etc.
- **Client Components** — used for interactive elements: tables with sorting, modals, charts

```tsx
// Example server component pattern (owners/page.tsx)
export default async function OwnersPage() {
  const data = await fetchOwners({ page: 1 });
  return <OwnersTable owners={data.results} count={data.count} />;
}
```

```tsx
// Example server action (actions/createOwnerAction.ts)
"use server";
export async function createOwnerAction(formData: FormData) {
  // calls services/admin.ts → POST /api/v1/admin/owners/
}
```

---

## Services Layer

Services in `src/services/` are typed async functions that wrap `fetch` calls to the backend API. They are called from both server components and server actions.

| File | Exports | Backend endpoints |
|---|---|---|
| `auth.ts` | `loginWithPassword`, `logout`, `refreshToken` | `/api-public/v1/auth/login/password/`, `token/refresh/`, `logout/` |
| `admin.ts` | `fetchOwners`, `fetchOwner`, `createOwner`, `updateOwner`, `fetchBusinesses`, `fetchSubscriptions` | `/api/v1/admin/owners/`, `businesses/` |
| `overview.ts` | `fetchDashboardStats` | `/api/v1/admin/stats/` |
| `owner.ts` | `fetchOwnerDetail` | `/api/v1/admin/owners/<id>/` |
| `users.ts` | `fetchUsers`, `createUser` | `/api/v1/users/` |

All services read `NEXT_PUBLIC_API_URL` (set at build time) as the API base URL.

---

## Components

Components live in `src/components/`. Organised by domain and shared UI primitives:

**UI primitives:**
- `Button`, `Input`, `Select`, `Badge`, `Modal`, `Drawer` — shared form and layout elements
- `Table`, `Pagination` — data display
- `Card`, `StatCard` — KPI and summary cards
- `Chart` (wrapping Recharts) — line, bar, and pie charts

**Domain components:**
- `OwnersTable` — paginated owner list with search and sort
- `BusinessCard` — business summary tile
- `SalesChart` — revenue over time (Recharts LineChart)
- `InventoryTable` — stock levels grid
- `SubscriptionBadge` — plan status indicator

**Layout components:**
- `Sidebar` — navigation drawer with role-based menu items
- `Header` — top bar with user menu and locale switcher
- `DashboardShell` — wraps all protected pages

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
import { useTranslations } from "next-intl";
const t = useTranslations("owners");
<h1>{t("title")}</h1>
```

**RTL support:** Arabic locale triggers `dir="rtl"` on the HTML element via the locale layout.

---

## Environment Variables

Set in `admin/.env.local` for development, or injected via Docker build args / compose env in production.

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend API base URL (baked into client bundle) |
| `NEXTAUTH_SECRET` | `...` | Secret for NextAuth session signing (if used) |
| `NEXT_PUBLIC_APP_NAME` | `AmanaPOS` | Displayed in page titles |

In production (`docker-compose.prod.yml`), `NEXT_PUBLIC_API_URL` points to the production API domain (e.g. `https://api.amanapos.com`).

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
```

In production the admin container is built with `NEXT_PUBLIC_API_URL` injected as a Docker build arg, so the client bundle contains the correct production API URL at build time.

The Nginx reverse proxy serves the admin dashboard at the `/admin` path (or subdomain, depending on nginx config) and proxies API calls to the Django backend.
