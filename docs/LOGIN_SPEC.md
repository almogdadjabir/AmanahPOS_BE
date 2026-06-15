# AmanaPOS — Login Redesign Spec

Implementation handoff for the two login prototypes. Target stack: **Next.js (App Router) + next-intl + Tailwind + shadcn/ui**. Brand: teal `#0D7C72`. Fonts: **Space Grotesk** (display + numbers), **Hanken Grotesk** (UI/body).

Two directions, **identical functionality**, different skin:
- **A — Premium (dark fintech split-screen):** `AmanaPOS Login Premium.html`
- **B — Light (airy centered card):** `AmanaPOS Login Light.html`

Pick one as default; both share the same form logic, tokens, and i18n.

---

## 1. Design tokens

```css
/* Brand */
--teal:#0D7C72; --teal-600:#0D6B63; --teal-700:#0A5C55; --teal-ink:#064E47;
--teal-glow:#1FB7A6; --teal-soft:#F0FDFA;
--gold:#D4B675;            /* champagne dot accent only */
--navy:#0B1626; --navy-2:#0F1F33;   /* Premium brand panel only */

/* Neutrals (tuned warm-cool) */
--bg:#FBFCFD; --surface:#FFFFFF;
--line:#E6EBF1; --line-2:#D3DBE5;
--ink:#0C1521; --ink-2:#46535F; --ink-3:#7A8794; --ink-4:#A6B0BC;
--danger:#DC4747;

/* Radii */ --r-md:14px; --r-lg:20px; --r-xl:26px;
/* Motion */ --ease:cubic-bezier(.22,1,.36,.68); --easeOut:cubic-bezier(.16,1,.3,1);
```

**Type scale:** title 26–30 / lead 15 / label 13 / input 15.5 / OTP digit 25. Numbers always `font-variant-numeric: tabular-nums`.

**Elevation discipline:** one language per screen. Premium form side = flat + hairline. Light card = single soft shadow + hairline border (`0 22px 50px -28px rgba(12,21,33,.22)`). Never border **and** heavy shadow on everything.

---

## 2. Component structure

```
LoginPage
├─ BrandPanel        (A: dark split aside | B: centered logo block)
└─ AuthCard
   ├─ MethodToggle   (segmented: "One-time code" | "Password")  — sliding pill
   ├─ StepEnter
   │  ├─ PhoneField  (+249 fixed CC chip + formatted national number)
   │  ├─ OtpMethod   → SendCodeButton + "Send via WhatsApp instead"
   │  └─ PwMethod    → PasswordField + remember + forgot + SignInButton
   ├─ StepOtp        (back, "code sent to" chip w/ Change, 6× OtpInput, resend timer)
   └─ StepSuccess    (animated check ring → redirect to /dashboard)
```

State machine: `enter → (send) → otp → (verify) → success`. Password path: `enter → (signin) → success`.

---

## 3. Behavior contract (must-have)

**Phone field**
- Fixed `+249` country chip (Sudan). National input is numeric-only, auto-formats `### ### ###`, max 9 digits.
- `inputmode="numeric"`, `autocomplete="tel"`.

**OTP input (6 boxes)**
- Auto-advance on entry; **backspace** on empty box moves focus back and clears previous.
- **Arrow keys** move focus L/R.
- **Paste** a 6-digit code fills all boxes and focuses the next empty / last.
- Each box: `inputmode="numeric"`, single char, `.filled` state (teal border + `--teal-soft`). First box `autocomplete="one-time-code"` for iOS SMS autofill.
- **Auto-submit** when all 6 filled.
- Wrong code → `.error` (red border + shake), inline message, clear boxes, refocus first.
- **Resend**: 30s countdown, disabled until 0, then "Resend code".

**Buttons**
- Loading state swaps label → spinner, disables. Pressable: `active { translateY(1px) scale(.995) }`.

**i18n / RTL**
- EN ↔ العربية toggle sets `dir`. Use **logical properties everywhere** (`margin-inline`, `inset-inline-start`, `padding-inline-end`) — already done in prototypes. Segmented pill, arrows, and the "code sent to → Change" row all mirror correctly. Wire to `next-intl` locale, not local state.

**Responsive**
- A (Premium): `grid-template-columns: 1.05fr .95fr`; below **980px** the brand aside hides and a compact navy header (`.m-brand`) appears above a full-width form.
- B (Light): centered, `max-width: 432px`; below **480px** card goes edge-to-edge.
- Use `100dvh` (not `100vh`) so mobile browser chrome doesn't clip.

**Accessibility**
- Inputs need real `<label>`s (visually-hidden if needed). OTP group should expose an `aria-label="Verification code"`. Maintain visible focus rings (the `0 0 0 4px rgba(13,124,114,.13)` ring satisfies this — don't remove it).
- Password toggle needs `aria-label` + `aria-pressed`.

---

## 4. Wiring (replace the demo stubs)

The prototypes fake the backend with `setTimeout`. Replace:

| Prototype stub | Real action |
|---|---|
| `sendBtn` click → timeout | `POST /auth/otp/request { phone, channel: 'sms' \| 'whatsapp' }` |
| `waBtn` | same endpoint with `channel: 'whatsapp'` |
| `submitOtp()` `=== '123456'` | `POST /auth/otp/verify { phone, code }` → set session, redirect |
| `pwBtn` | `POST /auth/login { phone, password, remember }` |
| `resendBtn` | re-call request endpoint; reset 30s timer |

**Remove the `123456` demo hint line** before production.

Recommend rate-limiting OTP requests server-side, 5-min code TTL, and a max-attempts lockout — surface those as the `.error` message.

---

## 5. Suggested file map (Next.js)

```
app/[locale]/login/page.tsx        # server shell + locale
components/auth/AuthCard.tsx       # method toggle + step machine ('use client')
components/auth/PhoneField.tsx
components/auth/OtpInput.tsx        # the 6-box logic above
components/auth/BrandPanel.tsx      # variant: 'premium' | 'light'
lib/auth/api.ts                    # request/verify/login fns
messages/en.json, messages/ar.json # all strings below
```

**Strings to translate:** Welcome back · Sign in to your dashboard… · One-time code · Password · Phone number · Send verification code · Send via WhatsApp instead · Enter your code · We sent a 6-digit… · Code sent to · Change · Verify & sign in · Didn't get it? · Resend in {n}s · Resend code · Keep me signed in · Forgot password? · New to AmanaPOS? · Talk to sales · You're in · Taking you to your dashboard…

---

## 6. Reference prototypes
- `AmanaPOS Login Premium.html` — direction A
- `AmanaPOS Login Light.html` — direction B

Both are self-contained (Google Fonts via CDN). Demo OTP code: `123456`.
