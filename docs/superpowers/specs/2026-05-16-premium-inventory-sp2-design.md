# Premium Inventory — Sub-project 2 Design

**Date:** 2026-05-16  
**Status:** Approved  
**Scope:** Premium Inventory UI shell — tab navigation, KPI cards, Inbound tab with transactions list + detail drawer, Vendor management tab  
**Depends on:** Sub-project 1 (all backend endpoints + frontend actions already exist)  
**Does NOT include:** Low Stock tab, Expiry tab, Reports tab (sub-project 3)

---

## Summary of Decisions

| Decision | Choice |
|---|---|
| Page layout when enabled | Full tab takeover (Option A) |
| Tab set | 3 tabs: Stock \| Inbound \| Vendors (SP3 adds Low Stock, Expiry, Reports) |
| Tab state | Client-side (`useState`) — instant switching, no page navigation |
| Inbound tab content | Receive Stock bar + full paginated transactions table + detail drawer |
| Vendors tab layout | Card list + side drawer for add/edit |
| Locked state | Amber card above existing basic stock table |

---

## Page Structure

`inventory/page.tsx` (Server Component) fetches three data sources in parallel:

```typescript
const [bizRes, profileRes, summaryRes] = await Promise.all([
  fetchBusiness(),
  fetchUserProfile(),
  fetchPremiumSummaryAction(),   // from SP1 actions
]);
```

**When feature is disabled** (`isInboundEnabled === false`):
```
InventoryDrawerShell
  PremiumLockedInventoryCard   ← NEW (replaces InboundReceivingPanel locked card)
  InventoryStats               ← unchanged
  InventoryFilters             ← unchanged
  InventoryTable               ← unchanged
```
Basic stock browsing remains fully functional. The locked card communicates what the premium tier unlocks.

**When feature is enabled**:
```
InventoryDrawerShell
  PremiumInventoryShell (Client)   ← NEW — owns tab state
    PremiumKPIRow                  ← NEW — server data passed as props
    TabBar: Stock | Inbound | Vendors
    [Stock tab]    → children: InventoryStats + InventoryFilters + InventoryTable
    [Inbound tab]  → InboundReceivingPanel + InboundTransactionsList (lazy)
    [Vendors tab]  → VendorsList + VendorDrawer (lazy)
```

---

## Component Architecture

### Approach: Client-side tab state

`PremiumInventoryShell` is a Client Component managing `activeTab: 'stock' | 'inbound' | 'vendors'`. The Stock tab content (existing server components) is passed as `children` from `page.tsx` — pre-rendered on every page load. The Inbound and Vendors tabs are lazy: their data fetches only run when the user first activates the tab.

This matches the existing pattern (`InventoryDrawerShell` wraps server content as children) and requires no URL routing changes.

---

## New Files

| File | Type | Purpose |
|---|---|---|
| `_components/PremiumInventoryShell.tsx` | Client | Tab state manager, renders tab bar + active panel |
| `_components/PremiumKPIRow.tsx` | Presentational | 8 KPI stat cards, data passed as props |
| `_components/PremiumLockedInventoryCard.tsx` | Presentational | Locked amber card (feature disabled state) |
| `_components/InboundTransactionsList.tsx` | Client | Paginated inbound transactions table, lazy-fetched |
| `_components/InboundTransactionDetailDrawer.tsx` | Client | Full transaction detail in Drawer |
| `_components/VendorsList.tsx` | Client | Vendor card list with search + active filter, lazy-fetched |
| `_components/VendorDrawer.tsx` | Client | Add/edit vendor form in Drawer |

### Modified files

| File | Change |
|---|---|
| `inventory/page.tsx` | Add `fetchPremiumSummaryAction()` to parallel fetch; conditional render (locked vs shell) |
| `actions/inventory.ts` | Add `createVendorAction`, `updateVendorAction`, `deactivateVendorAction` |
| `messages/en.json` | Add `inventory.premium.*`, `inventory.vendors.*`, `inventory.inboundList.*` keys |
| `messages/ar.json` | Same keys in Arabic |

`InboundReceivingPanel.tsx` — **no changes.** Used as-is inside the Inbound tab. Its internal locked card is now unreachable (the page renders `PremiumLockedInventoryCard` instead when the feature is disabled).

---

## KPI Row

`PremiumKPIRow` receives a `PremiumInventorySummary` prop (pre-fetched in `page.tsx`). Renders 8 `StatCard` instances in a `grid-cols-2 lg:grid-cols-4` grid — two rows of 4 on desktop:

**Row 1:** Total SKUs · Low Stock · Out of Stock · Expiring Soon (≤30 days)  
**Row 2:** Expired Batches · Active Vendors · Inbound This Month · Units Received This Month

Uses existing `StatCard` and `StatCardSkeleton` components. If `summaryRes` is null (feature not enabled on plan or fetch error), renders `null` — the locked card handles the UI.

---

## Locked State

`PremiumLockedInventoryCard` — a full-width amber shimmer card (same gilded design language as the existing `PremiumLockedCard` in `InboundReceivingPanel`). Rendered above the basic stock table so basic inventory browsing still works.

- **Title:** "Advanced Inventory"
- **Description:** "Unlock inbound receiving, vendor tracking, expiry reports, and low-stock insights."
- No CTA button (contact admin / upgrade path is out of scope for SP2)

---

## Inbound Tab

### Layout
```
InboundReceivingPanel   ← existing component, unchanged
InboundTransactionsList ← new, lazy-fetched on first tab activation
```

### `InboundTransactionsList`
- Fetches `GET /api/v1/inventory/inbound/` on first activation using a new `fetchInboundListAction` server action. The backend list endpoint and all auth patterns are already in place from SP1.
- **Columns:** Reference · Vendor · Shop · Items · Total Qty · Date
- **Pagination:** "Load more" button appends next page (no full re-render)
- **Row click** → opens `InboundTransactionDetailDrawer`
- **Refresh:** `router.refresh()` is already called by `InboundReceivingPanel.onSuccess`, which revalidates the page and triggers a re-fetch of the list

### `InboundTransactionDetailDrawer`
- Opens on row click, calls `fetchInboundTransactionAction(id)` from SP1 actions
- Displays: reference, vendor (name + phone), shop, notes, created by, date
- Items table: product name · quantity · unit cost · expiry · batch number
- Uses existing `Drawer` component

---

## Vendors Tab

### `VendorsList`
- Fetches `GET /api/v1/inventory/vendors/` on first activation
- **Default filter:** `is_active=true` only (toggle to show all)
- **Search:** debounced 300ms, `?search=` param
- **Card per vendor:** name (bold) · phone + email (muted) · active/inactive pill
- Inactive cards are visually dimmed (opacity-50)
- **"Add Vendor"** button (header right) → opens `VendorDrawer` in create mode
- **"Edit"** on each card → opens `VendorDrawer` in edit mode
- **Deactivate / Re-activate** secondary action on each card → calls `deactivateVendorAction(id)` / `reactivateVendorAction(id)` — optimistic update (card dims immediately)

### `VendorDrawer`
- Uses existing `Drawer` component
- **Create mode** (Add Vendor): empty form, calls `createVendorAction`
- **Edit mode**: pre-filled form, calls `updateVendorAction`
- Fields: Name (required) · Phone · Email · Address · Notes
- Uses `useActionState` for form state (same pattern as stock adjustment form)
- On success: closes drawer, calls `router.refresh()` to reload vendor list

### New server actions
```typescript
// actions/inventory.ts additions
createVendorAction(_prev: VendorFormState, formData: FormData): Promise<VendorFormState>
  // POST /api/v1/inventory/vendors/

updateVendorAction(id: string, _prev: VendorFormState, formData: FormData): Promise<VendorFormState>
  // PATCH /api/v1/inventory/vendors/<id>/

deactivateVendorAction(id: string): Promise<{ ok: boolean; error?: string }>
  // DELETE /api/v1/inventory/vendors/<id>/ (soft-delete)

reactivateVendorAction(id: string): Promise<{ ok: boolean; error?: string }>
  // PATCH /api/v1/inventory/vendors/<id>/ { is_active: true }

fetchInboundListAction(params?): Promise<InboundListResult>
  // GET /api/v1/inventory/inbound/ — paginated, filtered
```

---

## i18n Keys

New keys to add under `inventory` in both `en.json` and `ar.json`:

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
  "reactivate": "Reactivate",
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

---

## Acceptance Criteria

1. When feature disabled: amber locked card shown above basic stock table; stock browsing unaffected.
2. When feature enabled: 8 KPI cards shown at top with real data.
3. Tab bar shows Stock | Inbound | Vendors; switching is instant (no page reload).
4. Stock tab renders existing `InventoryStats` + `InventoryFilters` + `InventoryTable` unchanged.
5. Inbound tab shows `InboundReceivingPanel` + paginated transactions list; clicking a row opens detail drawer.
6. After recording an inbound, the transactions list refreshes automatically.
7. Vendors tab shows vendor cards with search and active/all toggle.
8. "Add Vendor" and "Edit" open the drawer form; save creates/updates vendor and refreshes list.
9. Deactivate/Re-activate updates vendor status immediately (optimistic).
10. All new text is i18n-keyed; Arabic translations provided.
11. TypeScript compiles clean.
12. No existing inventory functionality broken.
