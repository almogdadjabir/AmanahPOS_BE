# AmanaPOS Platform Admin — Fix List (Round 2)

**Read this with `Platform-Admin-Corrected.html` open in a browser.** That file is the
**pixel target**. This list explains *what* to change and *why*; the HTML shows the exact result.
Apply against the `PREMIUM_DESIGN_SYSTEM.md` tokens you already have.

Your first pass applied the tokens and layout well. These 18 fixes close the gap from
"template" to "premium". They are ordered by severity. **🔴 = do first.**

---

## 🔴 CRITICAL — breaks the premium feel

### Fix #1 — Header / sidebar top seam must be ONE continuous hairline
**Problem:** the sidebar brand block and the top header have different heights / different
bottom borders, so the top-left corner looks stepped and disconnected.
**Fix:**
- Sidebar brand block: `h-[60px]` exactly, `border-b border-border`.
- Header (topbar): `h-[60px]` exactly, `border-b border-border`.
- Same height + same border color ⇒ the hairline runs unbroken across the whole top.
- Sidebar container uses `border-e border-border` (the vertical hairline) and the header's
  bottom border meets it at a clean cross.

### Fix #2 — One icon set, one stroke width
**Problem:** KPI icons, nav icons, and section-header icons are from different families /
weights (some filled, some thin). This is the "not same icon" issue.
**Fix:** use **Lucide** everywhere. Single config: `stroke-width: 1.8`, `fill: none`,
`stroke-linecap/linejoin: round`. Sizes by context: **17px** in nav, **15–16px** in chips,
**19px** in large action-card chips. No filled glyphs anywhere.

### Fix #3 — Language switcher must be a real segmented control
**Problem:** the lone `عربي` pill floats next to the avatar with no partner.
**Fix:** a 2-segment toggle `EN | ع`, `h-[34px]`, `border border-input rounded-lg`,
divider between segments, active side = `bg-primary-tint text-primary-700`. Same height as
the avatar and notification button so the header cluster aligns.

### Fix #4 — Remove the broken bottom-left avatar / stray red "N" badge
**Problem:** a red circular "N" badge overlaps the "Sign out" text and the user card collides
with it (z-index / overflow bug).
**Fix:** the sidebar footer is a single clean user row: `avatar (32px) · name · phone · chevron`,
`hover:bg-muted rounded-lg`. No floating notification badge here. Put "Sign out" inside the
dropdown the chevron opens, not as overlapping text. Remove the stray red bubble entirely.

---

## 🟠 HIGH — visible inconsistencies

### Fix #5 — Remove the colored top-accent bar on KPI cards
**Problem:** each stat card has a small colored line across its top edge — the exact
"random line on the border" to avoid, and the colors are arbitrary.
**Fix:** delete the top bar. KPI card = `border border-border rounded-xl shadow-xs`, nothing else.
Same rule for nav: the active item is tint + colored icon, **no `border-s-2` accent bar**.

### Fix #6 — Kill the blue; teal is the only hue
**Problem:** the "Total Businesses" card used a blue accent. Blue is not in the brand.
**Fix:** remove all blue. If you want to differentiate KPI icons, vary only the **icon-chip tint**
within the neutral/teal/amber set — never structural color. "Expired Subscriptions" icon chip =
neutral gray (it's 0, not an error). Reserve amber for real warnings.

### Fix #7 — KPI numbers: lighter weight, correct font
**Problem:** the big numbers render too heavy/black, wrong font.
**Fix:** `font-semibold` (600, **not** 700/800), **Geist**, `tracking-[-.035em]`, `tabular-nums`,
`leading-none`. Size ~30px. They should feel engineered and tight, not chunky.

### Fix #8 — Unify section-header icon chips
**Problem:** card-header icons vary in weight; some filled.
**Fix:** one chip component: `32px rounded-[9px] bg-muted`, icon `16px text-muted-foreground`
(Lucide, 1.8 stroke). Use the teal-tint variant only for the primary panel (e.g. Owner Growth).

### Fix #9 — "Inactive" badge should be neutral, not alarm-red
**Problem:** Inactive owners show a hot red badge; red should mean error/refund.
**Fix:** Inactive = `bg-muted text-muted-foreground` with a gray dot. Keep green for Active.
Red is reserved for Failed / Refunded / Expired-and-overdue states only.

---

## 🟡 MEDIUM — polish

### Fix #10 — Chart: one teal, show empty months, trim dead space
**Problem:** two different greens (mint + teal); huge empty area; empty months blank.
**Fix:** all bars `#0F766E`. Months with 0 get a 3px gray baseline tick (`--input` color) so the
axis reads as continuous. Y-axis labeled 0–10. Reduce chart height (~200px viewBox) to cut dead
space. (See the `#growthChart` renderer in the reference — static rects, no fragile SVG transforms.)

### Fix #11 — Consistent spacing scale
**Problem:** gaps between sections and card paddings vary.
**Fix:** **16px** gap between cards in a row, **16px** between stacked sections, **22–26px** below
the page header. Card padding **16–18px**. Don't mix.

### Fix #12 — Group the "Live" indicator into the header cluster
**Problem:** "Live" floats alone, far from the other controls.
**Fix:** make it a pill — `h-[34px] rounded-full bg-success-light text-success` with a pulsing
green dot — and place it first in the right-side header action cluster.

### Fix #13 — Align right-rail card height with the chart
**Problem:** "Recent Owners" is shorter than the chart card, leaving an awkward gap.
**Fix:** let both cards in the row stretch to equal height (grid `align-items: stretch`), or pad
the shorter card so their bottoms align.

### Fix #14 — Lock corner radii to the scale
**Fix:** cards `rounded-xl` (12px), buttons/inputs/chips `rounded-lg`/`rounded-md` (8px), small
chips 6px, pills/badges `rounded-full`. No `rounded-2xl` cards mixed with `rounded-md` cards.

---

## 🟢 LOW — finishing touches

### Fix #15 — Drop the 👋 emoji (Stripe/Linear tone)
Replace "Good morning 👋" with a calm title like **"Platform overview"** + a metadata subline.
Emoji-free matches the reference brands you chose.

### Fix #16 — Give "Peak May · 10" breathing room
Don't crowd it against the Bar/Line toggle; put it on its own line in the chart sub-header.

### Fix #17 — Add breadcrumbs to the header
`Platform › Dashboard` — current segment `text-foreground font-medium`, parents
`text-muted-foreground`, chevron separator `text-icon-rest`. Mirror the chevron in RTL.

### Fix #18 — Confirm table header style
`thead th`: `10.5px font-semibold uppercase tracking-wider text-muted-foreground bg-raise`,
border-bottom hairline. Amount & Time right-aligned (`text-end`), amounts `tabular-nums`
`font-semibold text-foreground`, receipt IDs `font-mono`.

---

## Definition of done (verify each)
- [ ] #1 Top hairline is unbroken across sidebar→header; both blocks are 60px.
- [ ] #2/#8 Every icon is Lucide, 1.8 stroke, no fills.
- [ ] #3 Language is a real EN|ع segmented control, 34px, aligned in the header cluster.
- [ ] #4 No stray red "N" bubble; bottom user row is clean, Sign out is in the menu.
- [ ] #5/#6 No colored top-bars on cards; no left accent bar on nav; zero blue anywhere.
- [ ] #7 KPI numbers are Geist 600, tight tracking, tabular.
- [ ] #9 Inactive = neutral gray badge; red only for error/refund/expired.
- [ ] #10 Chart is single teal with gray zero-ticks; no dead space; no SVG transform hacks.
- [ ] #11/#14 One spacing scale; one radius scale.
- [ ] #12 Live pill grouped in header.
- [ ] #15/#17 No emoji; breadcrumbs present.
- [ ] Whole screen still works in `dir="rtl"` (logical properties only).

*Pixel target: `Platform-Admin-Corrected.html`. Token reference: `PREMIUM_DESIGN_SYSTEM.md`.*
