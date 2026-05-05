# AmanaPOS — Landing Page

Next.js 15.3.1 · React 19 · TypeScript · Tailwind CSS · next-intl

Located at `landing_page/` — runs on port **3000** in development, served through Nginx in production.

---

## Table of Contents

- [Purpose](#purpose)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Internationalisation](#internationalisation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Build & Production](#build--production)
- [Planned Sections](#planned-sections)

---

## Purpose

The landing page is the public-facing marketing website for AmanaPOS. Its goals are:

- Introduce the product to potential customers (small/medium business owners in Sudan and MENA)
- Communicate key value propositions: offline-capable POS, multi-shop, Bankak integration, easy setup
- Drive sign-ups / contact (CTA buttons linking to the onboarding flow or a contact form)
- Provide multi-language support (Arabic and English) to reach the target market

---

## Tech Stack

| Dependency | Version | Purpose |
|---|---|---|
| `next` | 15.3.1 | App Router, static generation |
| `react` | 19 | UI framework |
| `typescript` | 5 | Type safety |
| `tailwindcss` | 3.4.17 | Utility-first CSS |
| `next-intl` | 3.26.3 | Multi-language routing via `[locale]` segment |

No additional UI libraries or charting dependencies — deliberately lightweight.

---

## Project Structure

```
landing_page/
├── public/
│   └── favicon.svg                  # Site favicon
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root HTML shell (sets lang, meta)
│   │   ├── icon.tsx                 # App icon (Next.js app icon API)
│   │   ├── apple-icon.tsx           # Apple touch icon
│   │   └── [locale]/
│   │       ├── layout.tsx           # Locale-aware layout (dir, font, provider)
│   │       ├── page.tsx             # Main landing page
│   │       ├── error.tsx            # Error boundary
│   │       └── not-found.tsx        # 404 page
│   │
│   ├── components/                  # Reusable UI sections and elements
│   ├── lib/                         # Utility helpers
│   ├── i18n/                        # next-intl config
│   ├── messages/                    # Translation JSON files (en.json, ar.json)
│   ├── styles/                      # Global CSS / Tailwind base
│   └── middleware.ts                # Locale detection and redirect
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
| `/` | Redirect | Middleware redirects to `/{defaultLocale}/` |
| `/{locale}/` | Landing page | Full single-page marketing site |
| `/{locale}/not-found` | 404 | Custom not-found page |

The landing page (`page.tsx`) is a single long-scroll page composed of section components:

```
Hero section          → headline, sub-headline, primary CTA
Features section      → key selling points (offline mode, multi-shop, Bankak, etc.)
How it works          → 3-step visual flow
Pricing section       → plan tiers (if applicable)
Testimonials          → (planned)
Contact / CTA         → sign-up link or contact form
Footer                → links, social, language switcher
```

---

## Internationalisation

The landing page uses `next-intl` with `[locale]` dynamic routing to support Arabic and English.

**Supported locales:** `en` (English), `ar` (Arabic)  
**Default locale:** `en`

**Locale detection order (middleware.ts):**
1. URL path prefix (`/en/`, `/ar/`)
2. `NEXT_LOCALE` cookie (set when user manually switches language)
3. `Accept-Language` request header (browser preference)
4. Fall back to default locale (`en`)

**Translation files:**
```
src/messages/
  en.json    # All English strings
  ar.json    # All Arabic strings
```

**RTL support:** When locale is `ar`, the root layout sets `dir="rtl"` and `lang="ar"` on the `<html>` element. Tailwind's `rtl:` variant handles mirrored layout where needed.

**Usage in components:**
```tsx
import { useTranslations } from "next-intl";
const t = useTranslations("landing");
<h1>{t("hero.headline")}</h1>
```

**Language switcher:** A component in the footer/header allows users to toggle between `en` and `ar`, which sets the `NEXT_LOCALE` cookie and navigates to the equivalent locale path.

---

## Environment Variables

The landing page is a static/SSG site with minimal runtime configuration.

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://amanapos.com` | Canonical URL used in meta tags and OG images |
| `NEXT_PUBLIC_DASHBOARD_URL` | `https://app.amanapos.com` | CTA "Get Started" link target |
| `NEXT_PUBLIC_API_URL` | `https://api.amanapos.com` | Backend URL (only if landing page makes API calls, e.g. contact form) |

Set in `landing_page/.env.local` for development.

---

## Running Locally

```bash
cd landing_page
cp .env.local.example .env.local   # fill in vars if needed
npm install
npm run dev                         # starts on http://localhost:3000
```

Or via Docker (all services):
```bash
make up    # landing page available at http://localhost:3000 or through Nginx at :8080
```

---

## Build & Production

```bash
npm run build      # Next.js build (SSG + SSR)
npm run start      # Start production server on port 3000
npm run lint       # ESLint
```

**Static generation:** Most pages are fully statically generated at build time (`generateStaticParams` for both `en` and `ar` locales), resulting in pre-rendered HTML served with zero server overhead.

In production, the `landing` container runs behind the Nginx reverse proxy. Nginx serves it at the root domain (e.g. `https://amanapos.com`) and caches static assets with long TTLs.

**Docker production (`docker-compose.prod.yml`):**
```yaml
landing:
  build:
    context: .
    dockerfile: Dockerfile.landing   # or inline in compose
  environment:
    - NEXT_PUBLIC_APP_URL=https://amanapos.com
    - NEXT_PUBLIC_DASHBOARD_URL=https://app.amanapos.com
  ports:
    - "3000"   # internal only, Nginx proxies
```

---

## Planned Sections

The landing page is currently in MVP state. Planned additions:

| Section | Status |
|---|---|
| Hero with animated POS mockup | Planned |
| Feature cards (offline mode, Bankak, multi-shop) | Planned |
| How it works (3-step diagram) | Planned |
| Pricing tiers | Planned |
| Arabic-first copywriting pass | Planned |
| SEO meta tags + OG images | Planned |
| Contact / demo request form | Planned |
| Customer testimonials | Future |
| Blog / resources section | Future |
