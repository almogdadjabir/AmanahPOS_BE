# AmanaPOS — Landing Page Claude Code Instructions

> Applies to everything inside `landing_page/`. Read the root `CLAUDE.md` first, then this file.

---

## What This Is

A **static marketing website** for AmanaPOS. Its only jobs are:

1. Explain the product to small/medium business owners in Sudan and the MENA region
2. Drive signups — CTA buttons point to `NEXT_PUBLIC_DASHBOARD_URL`
3. Support Arabic and English with proper RTL layout

It has **no backend calls** (except an optional contact form), **no auth**, **no state management**.
Keep it simple. Every dependency you add is a liability on a marketing page.

---

## Tech Stack

| Dep           | Version | Purpose                       |
| ------------- | ------- | ----------------------------- |
| `next`        | 15.3.1  | App Router, static generation |
| `react`       | 19      | UI framework                  |
| `typescript`  | 5       | Type safety                   |
| `tailwindcss` | 3.4.17  | Styling                       |
| `next-intl`   | 3.26.3  | Arabic + English routing      |

**No other libraries.** Don't install UI kits, animation libraries, or icon packs unless explicitly asked. The landing page is deliberately lightweight.

---

## Project Structure

```
landing_page/
├── public/
│   └── favicon.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root HTML shell (lang, meta)
│   │   ├── icon.tsx                 # App icon
│   │   ├── apple-icon.tsx           # Apple touch icon
│   │   └── [locale]/
│   │       ├── layout.tsx           # Locale layout (dir, font, provider)
│   │       ├── page.tsx             # Main landing page — all sections live here
│   │       ├── error.tsx            # Error boundary
│   │       └── not-found.tsx        # 404
│   ├── components/                  # Section and UI components
│   ├── lib/                         # Utility helpers
│   ├── i18n/                        # next-intl config
│   ├── messages/
│   │   ├── en.json                  # English strings
│   │   └── ar.json                  # Arabic strings — ALWAYS update both
│   ├── styles/                      # Global CSS
│   └── middleware.ts                # Locale detection + redirect
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Page Structure

`page.tsx` is a single long-scroll page composed of section components in this order:

```
<Navbar />           navigation + language switcher + CTA button
<HeroSection />      headline, sub-headline, primary CTA, POS mockup
<FeaturesSection />  key selling points (see below)
<HowItWorks />       3-step visual flow
<PricingSection />   plan tiers (if applicable)
<CTASection />       final signup push
<Footer />           links, social, language switcher
```

**Key selling points to highlight** (from the product itself — use these, don't invent others):

- Works offline — sells even without internet
- Multi-shop — one account, many branches
- Bankak integration — Sudan's mobile payment network built in
- Easy setup — no hardware, just a phone
- Real-time inventory tracking
- Loyalty points for customers

---

## Rules

### 1. Static generation only

Every page is statically generated at build time. Never add `export const dynamic = 'force-dynamic'` or server-side data fetching to any landing page route. The only exception is a contact form action.

```typescript
// next.config.ts — keep output as static where possible
// generateStaticParams provides both locales at build time
export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}
```

### 2. No client components unless truly needed

The landing page is almost entirely static content. Don't add `'use client'` unless the component genuinely needs `useState` or browser APIs (e.g. the language switcher, a mobile menu toggle, a contact form).

```typescript
// WRONG — marking a static section as client
'use client';
export function FeaturesSection() { ... }

// RIGHT — pure server component, no interactivity needed
export function FeaturesSection() { ... }
```

### 3. All user-facing strings go through next-intl

No hardcoded English anywhere in components. Every string — including `alt` text, `aria-label`, button text, meta descriptions — must come from the translation files.

```typescript
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('hero');
  return (
    <section>
      <h1>{t('headline')}</h1>
      <p>{t('subheadline')}</p>
      <a href={process.env.NEXT_PUBLIC_DASHBOARD_URL}>{t('cta')}</a>
    </section>
  );
}
```

Always update **both** `messages/en.json` and `messages/ar.json` in the same change. Never leave a key missing in one file.

### 4. RTL is a first-class requirement

Arabic is a primary market. Every layout must work in both LTR and RTL.

```typescript
// layout.tsx sets dir based on locale — already handled
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>

// In components, use Tailwind RTL variants for anything directional:
<div className="text-left rtl:text-right">
<div className="ml-4 rtl:mr-4 rtl:ml-0">
<div className="flex-row rtl:flex-row-reverse">

// For icons that are directional (arrows, chevrons), mirror them:
<ChevronRight className="rtl:rotate-180" />
```

Never hardcode `left`, `right`, `ml-*`, `mr-*`, `pl-*`, `pr-*` without their `rtl:` counterparts.

### 5. CTAs always point to the dashboard URL

```typescript
// Use the env var — never hardcode a URL
const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL;

<a href={dashboardUrl} className="...">
  {t('hero.cta')}
</a>
```

### 6. Performance is a feature

This is a marketing page — load time directly affects conversion. Rules:

- Images: always use `next/image` with proper `width`, `height`, and `alt`
- Fonts: load via `next/font`, never a `<link>` to Google Fonts
- No large JS bundles — keep client components minimal
- Prefer CSS animations over JS animations
- SVG illustrations inline in components (no extra HTTP requests)

```typescript
// CORRECT
import Image from 'next/image';
<Image src="/hero-mockup.png" width={600} height={400} alt={t('hero.mockupAlt')} priority />

// WRONG
<img src="/hero-mockup.png" />
```

### 7. SEO metadata on every page

```typescript
// app/[locale]/layout.tsx or page.tsx
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  return {
    title: 'AmanaPOS — نقطة البيع الذكية',
    description: '...',
    openGraph: {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}`,
      ...
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}`,
      languages: {
        'en': `${process.env.NEXT_PUBLIC_APP_URL}/en`,
        'ar': `${process.env.NEXT_PUBLIC_APP_URL}/ar`,
      },
    },
  };
}
```

---

## Internationalisation

**Supported locales:** `en` (default), `ar`

**Locale detection order** (middleware.ts):

1. URL prefix (`/en/`, `/ar/`)
2. `NEXT_LOCALE` cookie
3. `Accept-Language` header
4. Default → `en`

**Translation file structure:**

```json
// messages/en.json
{
  "nav": {
    "features": "Features",
    "pricing": "Pricing",
    "login": "Login",
    "getStarted": "Get Started"
  },
  "hero": {
    "headline": "The POS built for your business",
    "subheadline": "Sell online or offline. Manage inventory. Accept Bankak.",
    "cta": "Start for free",
    "mockupAlt": "AmanaPOS mobile app screenshot"
  },
  "features": {
    "title": "Everything you need",
    "offline": {
      "title": "Works offline",
      "description": "Keep selling even when the internet goes down. Sales sync automatically when you reconnect."
    }
  }
}
```

```json
// messages/ar.json — mirror structure, Arabic values
{
  "nav": {
    "features": "المميزات",
    "pricing": "الأسعار",
    "login": "تسجيل الدخول",
    "getStarted": "ابدأ مجاناً"
  },
  "hero": {
    "headline": "نقطة البيع المصممة لأعمالك",
    "subheadline": "بِع أونلاين أو أوفلاين. أدر المخزون. اقبل بنكك.",
    "cta": "ابدأ مجاناً",
    "mockupAlt": "لقطة شاشة تطبيق AmanaPOS"
  }
}
```

---

## Component Patterns

### Section component structure

```typescript
// components/HeroSection.tsx
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('hero');

  return (
    <section className="py-20 px-4 text-center rtl:text-right">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
        {t('headline')}
      </h1>
      <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        {t('subheadline')}
      </p>
      <a
        href={process.env.NEXT_PUBLIC_DASHBOARD_URL}
        className="mt-8 inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
      >
        {t('cta')}
      </a>
    </section>
  );
}
```

### Language switcher (client component — needs navigation)

```typescript
'use client';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (locale: string) => {
    // Replace the locale segment in the path
    const newPath = pathname.replace(`/${currentLocale}`, `/${locale}`);
    document.cookie = `NEXT_LOCALE=${locale}; path=/`;
    router.push(newPath);
  };

  return (
    <button onClick={() => switchLocale(currentLocale === 'en' ? 'ar' : 'en')}>
      {currentLocale === 'en' ? 'العربية' : 'English'}
    </button>
  );
}
```

### Contact form (the one case that needs a server action)

```typescript
"use server";
// actions/contact.ts
export async function submitContactForm(formData: FormData) {
  // validate → send email or store lead → return result
  // No backend API call needed — handle directly here
}
```

---

## Environment Variables

```bash
NEXT_PUBLIC_APP_URL          # Canonical URL — https://amanapos.com
NEXT_PUBLIC_DASHBOARD_URL    # Where CTAs point — https://app.amanapos.com
NEXT_PUBLIC_API_URL          # Only if contact form posts to backend
```

Never use `INTERNAL_API_URL` here — this is a public static site with no server-to-server calls.

---

## What NOT to Do

| ❌ Wrong                                | ✅ Right                                          |
| --------------------------------------- | ------------------------------------------------- |
| `<img src="...">`                       | `<Image>` from `next/image`                       |
| Hardcoded `"Get Started"` in JSX        | `t('hero.cta')` from next-intl                    |
| `ml-4` without `rtl:mr-4 rtl:ml-0`      | Always pair directional classes                   |
| `'use client'` on a static section      | Server component by default                       |
| `fetch()` in a page component           | This site is static — no data fetching            |
| Installing Framer Motion / GSAP         | CSS transitions and Tailwind animations           |
| Hardcoding `https://app.amanapos.com`   | `process.env.NEXT_PUBLIC_DASHBOARD_URL`           |
| Skipping `ar.json` when adding a key    | Always update both locale files                   |
| `<Link href="/pricing">` without locale | Use next-intl's `<Link>` for locale-aware routing |

---

## Running Locally

```bash
cd landing_page
cp .env.local.example .env.local
npm install
npm run dev        # http://localhost:3000
```

Or via Docker:

```bash
make up            # landing page at http://localhost:3000
```

---

## Checklist Before Submitting Any Landing Page Change

- [ ] Both `messages/en.json` and `messages/ar.json` updated?
- [ ] All directional CSS has `rtl:` counterparts?
- [ ] Images use `next/image` with `alt` from translations?
- [ ] No hardcoded URLs — using env vars for dashboard/app links?
- [ ] No `'use client'` added unnecessarily?
- [ ] No new npm packages added without a clear reason?
- [ ] Page still statically generates? (`npm run build` passes)
- [ ] SEO metadata present and translated?
