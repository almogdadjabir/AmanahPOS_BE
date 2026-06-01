# AmanaPOS — Premium Design System Upgrade

**Audience:** an AI coding agent working in the AmanaPOS Next.js admin dashboard
(Tailwind CSS + Radix UI + shadcn-style primitives, RTL/LTR, `next-intl`).

**Goal:** Take the dashboard from "clean template" to "premium SaaS" — the quality bar
of **Stripe, Linear, Ramp, and Vercel**. Light, crisp, fast, business-grade.
**Teal (`#0F766E`) stays the only brand color.**

> Look at `Dashboard-Premium-Reference.html` + `preview.png` in this folder for the exact
> visual target. Everything below maps that target onto the real component files.

---

## 0. The 5 principles (apply these everywhere)

1. **One edge per surface.** A surface gets a hairline border **or** a soft shadow that
   reads as a single crisp edge — **never both stacked**, and never a ring *plus* a border.
   The biggest "template tell" today is `ring-1 ring-inset` on badges and `border + shadow`
   doubled on cards. Pick one.
2. **Motion you feel.** Hover must do more than shift opacity. Buttons press down
   (`active:translate-y-px`), cards lift (`hover:-translate-y-px` + shadow), rows highlight,
   focus rings bloom. Every interactive element gets a transition.
3. **A real type ladder.** Quiet labels, confident numbers, clear jumps in size+weight.
   Stop using the same 13–15px / semibold tone for everything.
4. **Money is the hero.** This is a POS. Every figure uses **tabular numerals**, currency
   units set smaller and muted, and trend deltas (▲/▼). No `.00` decimals on SDG.
5. **Teal earns its place.** Use teal ONLY for: logo, active nav, primary button, links,
   chart lines, focus rings, and selected states. Everything else is the neutral gray ladder.
   Color elsewhere = decoration → remove it.

---

## 1. Design tokens (`globals.css` + `tailwind.config.ts`)

Replace the current palette with this one. Values are given as **hex** (source of truth) and as
**shadcn HSL channel triplets** (`H S% L%`) so they drop into `hsl(var(--token))` setups.
Keep your existing variable *names*; just change the *values*.

### 1.1 Neutrals — cool near-white canvas, true-white cards

| Token | Role | Hex | HSL triplet |
|---|---|---|---|
| `--background` | App canvas | `#F7F8FA` | `220 16% 98%` |
| `--card` / `--popover` | Cards, sheets, menus | `#FFFFFF` | `0 0% 100%` |
| `--muted` | Faint fills, table head, hovers | `#F4F5F7` | `220 14% 96%` |
| `--foreground` | Primary text | `#15181D` | `220 16% 10%` |
| `--muted-foreground` | Secondary text | `#5A6371` | `216 12% 40%` |
| `--muted-foreground-2`* | Tertiary / hints | `#8B95A4` | `215 13% 59%` |
| `--icon-rest`* | Icons at rest | `#AEB6C2` | `216 14% 72%` |
| `--border` | Hairline borders | `#ECEEF1` | `220 12% 94%` |
| `--input` | Input / stronger hairline | `#E1E4E9` | `218 14% 90%` |
| `--border-strong`* | Hover edges | `#D4D8DF` | `216 13% 85%` |
| `--ring` | Focus ring (teal) | `rgba(15,118,110,.16)` | — |

\* add these if they don't exist; they're what creates the 3-step gray ladder.

### 1.2 Brand — the only hue

| Token | Hex | HSL |
|---|---|---|
| `--primary` | `#0F766E` | `174 77% 26%` |
| `--primary-600` (hover) | `#0D6B63` | `174 81% 23%` |
| `--primary-700` (active/text) | `#0B5C55` | `174 79% 20%` |
| `--primary-foreground` | `#FFFFFF` | `0 0% 100%` |
| `--primary-50` (tint bg) | `#F0FAF8` | `170 45% 96%` |
| `--primary-100` | `#D9F2EE` | `170 42% 90%` |
| `--primary-tint` (active nav) | `rgba(15,118,110,.07)` | — |

### 1.3 Status — deep text on a soft tint, **no rings**

| Status | Text | Background | Dot |
|---|---|---|---|
| Success / Completed | `#067A57` | `#E9FAF1` | `#12B981` |
| Warning / Partial | `#9A5B0B` | `#FDF3E3` | `#E89923` |
| Danger / Refunded | `#B4321F` | `#FDF0EE` | `#EC5B45` |
| Info / Pending | `#2056C7` | `#EDF3FE` | `#4A82F0` |

Map your existing `success-light` / `warning-light` / `danger-light` / `info-light` tokens to
the **Background** column, and `success` / `warning` / `danger` / `info` to the **Text** column.

### 1.4 Elevation — soft, low-opacity, single-edge

Add these to `tailwind.config.ts` under `theme.extend.boxShadow` (replace `shadow-card`):

```ts
boxShadow: {
  'xs':   '0 1px 2px rgba(18,22,31,.05)',
  'card': '0 1px 2px rgba(18,22,31,.04), 0 2px 6px -1px rgba(18,22,31,.05)',
  'md':   '0 4px 10px -3px rgba(18,22,31,.08), 0 10px 26px -8px rgba(18,22,31,.10)',
  'teal': '0 1px 2px rgba(15,118,110,.32), 0 2px 8px -2px rgba(15,118,110,.30)',
}
```

### 1.5 Radius

```ts
borderRadius: { sm:'6px', md:'8px', lg:'10px', xl:'12px', '2xl':'16px' }
```
Cards `12px` (`rounded-xl`), buttons/inputs `8px` (`rounded-lg`→md), pills `full`, chips `6px`.
**Pick consistent radii** — don't mix `rounded-2xl` cards with `rounded-md` buttons randomly.

---

## 2. Typography

Switch the dashboard UI font to **Geist** (this is Vercel's typeface — it *is* the reference look).
Keep **Tajawal** for Arabic. Add **Geist Mono** for receipt codes, IDs, and figures.

```ts
// next/font/google or local
import { Geist, Geist_Mono } from 'next/font/google';
// keep Tajawal for `locale === 'ar'`
```

Apply `font-variant-numeric: tabular-nums` globally to any element showing numbers
(add a `.num` utility or put `tabular-nums` on every money/count cell).

### Type ladder (use these, kill arbitrary sizes)

| Role | Size / weight / tracking | Tailwind |
|---|---|---|
| KPI value / big number | 27px · 600 · -0.03em · tabular | `text-[27px] font-semibold tracking-[-.03em] tabular-nums` |
| Page title (h1) | 21px · 600 · -0.025em | `text-[21px] font-semibold tracking-[-.025em]` |
| Panel / card title | 14px · 600 · -0.015em | `text-sm font-semibold tracking-[-.015em]` |
| Body | 13.5px · 450 | `text-[13.5px]` |
| Secondary / caption | 12px · 450 · muted | `text-xs text-muted-foreground` |
| Label (uppercase) | 11px · 600 · 0.05em · uppercase · tertiary | `text-[11px] font-semibold uppercase tracking-wider` |
| Table header | 10.5px · 600 · 0.05em · uppercase | `text-[10.5px] font-semibold uppercase tracking-wider` |
| Mono (codes/IDs) | Geist Mono · 11.5px | `font-mono text-[11.5px]` |

---

## 3. Component upgrades (before → after)

> These reference your real files. Apply the class changes; keep the component APIs identical.

### 3.1 Button — `components/ui/button.tsx`

The current hover is just `bg-primary/90` (opacity). Give it a press, a color-matched shadow,
and a lift on secondary/outline.

```diff
const buttonVariants = cva(
- 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
+ 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-medium tracking-[-.01em] transition-[background,border-color,box-shadow,transform] duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[15px]',
  {
    variants: {
      variant: {
-       default:     'bg-primary text-primary-foreground hover:bg-primary/90',
+       default:     'bg-primary text-primary-foreground shadow-teal hover:bg-primary-600 active:shadow-xs',
-       secondary:   'bg-secondary text-secondary-foreground border border-border hover:bg-muted',
+       secondary:   'bg-card text-foreground border border-input shadow-xs hover:bg-muted hover:border-border-strong',
-       outline:     'border border-input bg-background hover:bg-muted hover:text-foreground',
+       outline:     'border border-input bg-card shadow-xs hover:bg-muted hover:border-border-strong [&_svg]:text-muted-foreground',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
-       ghost:       'hover:bg-muted hover:text-foreground',
+       ghost:       'text-foreground hover:bg-muted',
        link:        'text-primary underline-offset-4 hover:underline',
      },
      size: {
-       default:   'h-9 px-4 py-2',
+       default:   'h-9 px-3.5',
-       sm:        'h-8 rounded-md px-3 text-xs',
+       sm:        'h-8 px-3 text-[12.5px]',
        lg:        'h-10 px-5',
        icon:      'h-9 w-9',
        'icon-sm': 'h-8 w-8',
      },
```

### 3.2 Card — `components/ui/card.tsx`

Keep the single border, soften the shadow to the new `shadow-card`, and add an optional
`interactive` look for clickable cards (lift on hover).

```diff
- 'rounded-xl border border-border bg-card text-card-foreground shadow-card'
+ 'rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-[box-shadow,transform,border-color] duration-200'
```
For clickable cards, add: `hover:shadow-card hover:border-input hover:-translate-y-px cursor-pointer`.
Tighten header padding to `px-4 pt-4 pb-3` (already close). Card titles → `text-sm font-semibold tracking-[-.015em]`.

### 3.3 Badge / Status — `components/ui/badge.tsx`

**Remove the `ring-1 ring-inset`.** This is the #1 source of the "random line on the border"
busy look. Use soft fill + an optional dot only.

```diff
const badgeVariants = cva(
- 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ring-inset select-none',
+ 'inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11.5px] font-medium select-none',
  {
    variants: {
      variant: {
-       default:     'bg-muted text-muted-foreground ring-border',
+       default:     'bg-muted text-muted-foreground',
-       primary:     'bg-primary/10 text-primary ring-primary/20',
+       primary:     'bg-primary-50 text-primary-700',
-       success:     'bg-success-light text-success ring-success/20',
+       success:     'bg-success-light text-success',
-       destructive: 'bg-danger-light text-danger ring-danger/20',
+       destructive: 'bg-danger-light text-danger',
-       warning:     'bg-warning-light text-warning ring-warning/20',
+       warning:     'bg-warning-light text-warning',
-       info:        'bg-info-light text-info ring-info/20',
+       info:        'bg-info-light text-info',
        danger:      'bg-danger-light text-danger',
      },
    },
  },
);
```
The `dot` prop stays — render a 6px filled dot in the status color before the label.

### 3.4 Input — `components/ui/input.tsx`

```
h-9 rounded-lg border border-input bg-card px-3 text-[13px]
placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150
focus:border-primary focus:ring-[3px] focus:ring-ring focus:outline-none
```
Search inputs get a leading 15px icon (`ps-9`) and, on the global search, a trailing `⌘K`
`kbd` chip (`font-mono text-[10.5px] bg-muted border border-input rounded px-1.5`).

### 3.5 StatCard — `components/ds/StatCard.tsx`

Make the number the hero and add a trend delta. New props: `delta?: number`, `deltaLabel?: string`,
`trend?: 'up'|'down'|'flat'`.

- Value: `text-[27px] font-semibold tracking-[-.03em] tabular-nums leading-none`, with the
  currency unit as a `<span class="text-[12.5px] font-medium text-muted-foreground ms-1">SDG</span>`.
- Icon chip: `w-[30px] h-[30px] rounded-lg bg-primary-tint [&_svg]:text-primary` (or amber/blue tint
  for refunds/avg). Keep it small and top-right.
- Delta pill: `inline-flex items-center gap-1 text-[11.5px] font-semibold px-1.5 py-0.5 rounded-md`
  — green-bg/green for up, red-bg/red for down, `bg-muted text-muted-foreground` for flat. ▲/▼ icon.
- Card: `hover:shadow-card hover:-translate-y-px` for a subtle lift.

### 3.6 Table — `components/ui/table.tsx`

```
thead th: bg-muted/60 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground
          h-10 px-4 first:ps-5 last:pe-5 text-start last:text-end border-b border-border
tbody td: px-4 first:ps-5 last:pe-5 py-3 text-[13px] text-muted-foreground border-b border-border
tbody tr: transition-colors hover:bg-muted/40, last row no border
```
- Money + counts get `tabular-nums`, right-aligned (`text-end`), amount in `font-semibold text-foreground`.
- Receipt/ID columns use `font-mono text-[11.5px] text-muted-foreground`.
- Cashier cell = 26px rounded avatar (initials, low-saturation tint) + name `font-medium text-foreground`.
- Row action = a 28px ghost icon button (`⋮`) that appears subtle and darkens on hover.

### 3.7 Sidebar — `components/layout/Sidebar.tsx`

**Switch from the dark navy sidebar to a light/white sidebar** to match the Stripe/Linear/Vercel
direction (white sidebar, hairline right border on the canvas).

- Container: `bg-card border-e border-border`.
- Section labels: `text-[10px] font-semibold uppercase tracking-[.09em] text-icon-rest px-2 mb-1.5`.
- Nav item rest: `text-muted-foreground [&_svg]:text-icon-rest hover:bg-muted hover:text-foreground`.
- Nav item **active**: `bg-primary-tint text-primary-700 font-medium [&_svg]:text-primary`
  (drop the `border-s-2` accent bar — the tint + colored icon is enough; the bar reads as a stray line).
- Right-aligned live counts: `text-[11px] tabular-nums text-muted-foreground` (`text-primary` when active).
- Keep the subscription card (plan + days-left progress bar + Upgrade link) and the user row at the bottom.

### 3.8 Header / topbar — `components/layout/Header.tsx`

- `h-[60px] bg-background/80 backdrop-blur border-b border-border` (frosted, sticky).
- Left: breadcrumb `Business › Page` (`text-muted-foreground`, current segment `text-foreground font-medium`).
- Right cluster: global search (⌘K), a **persistent `Synced` pill** (green, pulsing dot — pull from
  your offline/online state, per the UX audit), notifications icon-button with an amber dot, EN/ع
  segmented toggle, avatar. All 34px tall, consistent gaps of 8px.

### 3.9 Pagination — `components/ds/Pagination.tsx`

- Buttons: `min-w-[30px] h-[30px] rounded-md text-[12.5px] font-medium text-muted-foreground hover:bg-muted`.
- Active page: `bg-primary text-primary-foreground shadow-teal`.
- Prev/next as chevron icon buttons; `…` as a non-interactive muted gap.
- Left side: `Showing 1–6 of 128` with the numbers `font-semibold tabular-nums text-foreground`.

### 3.10 EmptyState — `components/ds/EmptyState.tsx`

Drop the dashed border. Use a centered layout on `bg-card`: a 40px rounded-xl muted icon chip,
title `text-[15px] font-semibold`, description `text-[13px] text-muted-foreground`, then a primary
CTA. Generous vertical padding (`py-14`).

---

## 4. Charts

For any chart (Recharts or custom SVG): **single teal line** `#0F766E` at 2.4px, a soft area
gradient (`#0F766E` 18% → 0%), hairline horizontal gridlines (`--border`), mono axis labels in
`--icon-rest`, and one highlighted end-point dot (white fill, teal stroke). No multi-color series,
no heavy gridlines, no 3D, no drop shadows. See the `#revChart` renderer in the reference HTML for
the exact smooth-curve (Catmull-Rom) approach.

---

## 5. Numbers & currency (POS-critical)

One formatter, used everywhere (per the UX audit):

```ts
// SDG: no decimals, thousands separators, locale-aware digits
formatSDG(450000)               // "450,000"      (en) / "٤٥٠٬٠٠٠"      (ar)
formatSDG(450000, {unit:true})  // "450,000 SDG"  (en) / "٤٥٠٬٠٠٠ ج.س"  (ar)
```
- **Never** show `.00` on SDG.
- Render the currency unit (`SDG` / `ج.س`) one step smaller and in `--muted-foreground`.
- Always `tabular-nums` so columns of figures align.

---

## 6. Micro-interactions (the polish layer)

Add to every interactive element — keep durations 120–200ms, easing `ease`/`cubic-bezier(.4,0,.1,1)`:

| Element | Interaction |
|---|---|
| Buttons | `active:translate-y-px`, color-matched shadow on primary |
| Cards (clickable), StatCards | `hover:-translate-y-px` + shadow step up |
| Table rows | `hover:bg-muted/40` |
| Nav items | background + icon-color transition |
| Inputs | focus border→teal + 3px ring bloom |
| Status dot (online) | gentle `ping` pulse |
| Progress / bars | grow-in on mount (`scaleX` from 0) |

Respect `prefers-reduced-motion: reduce` → disable transforms/animations.

---

## 7. RTL / i18n (don't regress this)

The current RTL discipline is good — keep it. Use logical properties only: `ms-/me-`, `ps-/pe-`,
`text-start/text-end`, `border-s/border-e`, `start-/end-`. Mirror chevrons and the breadcrumb
separator for `dir="rtl"`. The frosted header, sidebar, and table all work in both directions.

---

## 8. Rollout checklist (order matters)

1. **Tokens first** — update `globals.css` variables + `tailwind.config.ts` (shadows, radius, fonts).
   Nothing else works until this lands. (Sections 1–2)
2. **Primitives** — `button`, `card`, `badge`, `input`, `table`. (Section 3.1–3.6)
3. **Chrome** — `Sidebar` (light), `Header` (frosted + Synced pill). (3.7–3.8)
4. **DS molecules** — `StatCard` (deltas), `Pagination`, `EmptyState`, `SearchInput`. (3.5, 3.9, 3.10)
5. **Charts + formatter** — teal single-line charts, `formatSDG`. (Sections 4–5)
6. **Per screen** — apply across: Dashboard → Sales → Products → Inventory → Refunds → Customers
   → Staff → Reports. On each: remove stacked edges, apply the type ladder, make numbers tabular,
   add hover/press states, cut any non-teal accent color.

### Definition of done (per screen)
- [ ] No element has a `ring` **and** a `border` **and** a `shadow` stacked.
- [ ] Every number is `tabular-nums`; no `.00` on SDG; currency unit is smaller + muted.
- [ ] Type uses the ladder (Section 2) — no stray arbitrary sizes.
- [ ] Every interactive element has a hover **and** an active/press state.
- [ ] Teal appears only on: logo, active nav, primary button, links, chart, focus ring, selected.
- [ ] Works in both `dir="ltr"` and `dir="rtl"`.

---

*Reference files in this folder: `Dashboard-Premium-Reference.html` (open in a browser) and
`preview.png`. Match that bar.*
