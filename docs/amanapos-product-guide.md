# AmanaPOS — Product Guide
**For Sales & Support Teams**

---

## What Is AmanaPOS?

AmanaPOS is a multi-tenant, offline-capable Point-of-Sale SaaS for small and medium businesses in Sudan and the MENA region. Each business runs in complete isolation — data is never shared across tenants.

---

## Business Types

Every business registers as one of two types. This choice affects inventory behavior.

| Type | Label | Inventory Tracking |
|---|---|---|
| `shop` | Retail Shop | ✅ Full — stock is deducted on every sale |
| `restaurant` | Restaurant | ❌ None — no stock deduction on sales |

> **Support tip:** If a restaurant owner complains that stock is going down when they sell, their account is set to `shop`. Check the business type and update it.

---

## User Roles

Three roles exist within a business. The platform super-admin sits outside this hierarchy.

### Role Comparison

| Capability | Cashier | Manager | Owner |
|---|---|---|---|
| Create & process sales | ✅ | ✅ | ✅ |
| View customers + loyalty points | ✅ | ✅ | ✅ |
| View products & stock levels | ✅ (read-only) | ✅ | ✅ |
| Manage products & categories | ❌ | ✅ | ✅ |
| Adjust / transfer stock | ❌ | ✅ | ✅ |
| Receive inbound stock from vendors | ❌ | ✅ | ✅ |
| Issue refunds | ❌ | ✅ | ✅ |
| Manage staff (invite, deactivate) | ❌ | ❌ | ✅ |
| Create & manage shops | ❌ | ❌ | ✅ |
| View sales reports & KPIs | ❌ | ✅ | ✅ |
| Manage subscription | ❌ | ❌ | ✅ |
| Set password (for admin dashboard login) | ❌ | ❌ | ✅ |

### Platform Super-Admin (`is_staff`)

A separate flag, not a business role. Staff admins access the **admin dashboard** and can:
- Create / deactivate owner accounts
- Create / manage subscription plans
- Subscribe businesses to plans
- Toggle business active status
- View platform-wide activity logs
- Send push notifications to any user
- Issue refunds from the admin dashboard

---

## Subscription Plans

Plans are configured by super-admins. Every plan has the following limits:

| Limit | What It Controls | 0 = |
|---|---|---|
| `max_shops` | Max active shops per business | Unlimited |
| `max_products` | Max active products per business | Unlimited |
| `max_users` | Max staff accounts (managers + cashiers; owner excluded) | Unlimited |
| `duration_days` | Subscription length in days | — |
| `features` | JSON dict of premium feature flags | — |

When a limit is hit, the API returns an error — the operation is blocked until the business upgrades or removes existing resources.

> **Sales tip:** When pitching, the key differentiators are: number of shops, number of products, number of staff seats, and access to premium features.

---

## Premium Feature Flags

Feature flags are stored on the Plan and exposed to each user in their profile response. Currently one flag is implemented:

| Feature Key | Label | What It Unlocks |
|---|---|---|
| `inventory_inbound_receiving` | Inbound Receiving | Ability to receive stock from vendors, create inbound transactions, manage vendors, and access vendor analytics |

**Disabled (flag = false / missing):**
- `/api/v1/inventory/inbound/` endpoints return 403
- Vendor management is unavailable
- The "Receive Stock" UI panel shows a locked state

**Enabled (flag = true):**
- Full inbound receiving workflow
- Vendor list and vendor purchase history
- Inbound transaction history and reports

---

## Core Features

### Sales
- Create sales with one or multiple items
- Supports 8 payment methods (see below)
- Optional customer assignment (for loyalty tracking)
- Cancel a pending or completed sale
- Issue full or **partial refund** with per-item quantity control
- Offline sale creation on mobile — synced to server when back online
- Sales summary with date range and shop filters

### Products & Categories
- Hierarchical categories (root → sub-categories)
- Per-product: name, SKU, barcode, price, cost price, unit type, image
- Units supported: `pcs`, `kg`, `g`, `l`, `ml`, `m`, `box`, `pack`, `dozen`, `other`
- Toggle individual products active/inactive
- `track_inventory` flag per product — disable stock tracking for specific items

### Inventory
- Stock levels tracked **per product per shop**
- Stock movements logged automatically: sales, adjustments, transfers, returns, inbound
- Manual stock adjustment (add / remove with reason)
- Inter-shop stock transfers
- Batch/expiry tracking with configurable alert window
- Low-stock threshold per product
- **Premium:** Inbound receiving from named vendors

### Customers
- Name, phone, email, address
- Loyalty points balance (awarded on sales, redeemable via payment method)
- Total purchase history

### Staff Management
- Owner invites managers and cashiers by phone number
- Each staff member assigned to a `default_shop`
- Deactivation (soft delete) — does not delete historical data

### Shops
- A business can have 1–N shops (limited by plan)
- Each shop has independent stock levels
- One shop can be flagged as `is_main`
- Sales, stock, and staff are all scoped to a shop

### Notifications
- In-app push notifications (Android, iOS, web)
- Types: `info`, `success`, `warning`, `error`, `sale`, `stock`, `subscription`, `security`, `system`
- Super-admins can broadcast notifications to specific users or all users

---

## Payment Methods

| Method | Key | Mobile (MVP) | Notes |
|---|---|---|---|
| Cash | `cash` | ✅ Live | Default |
| Bankak | `bankak` | ✅ Live | Local Sudanese payment; account number snapshotted on sale |
| Card | `card` | ⏸️ Coming soon | Not available in current release |
| Bank Transfer | `bank_transfer` | ⏸️ Coming soon | Not available in current release |
| Mobile Wallet | `mobile_wallet` | ⏸️ Coming soon | Not available in current release |
| Loyalty Points | `loyalty_points` | ⏸️ Coming soon | Not available in current release |
| Split | `split` | ⏸️ Coming soon | Not available in current release |
| Credit | `credit` | ⏸️ Coming soon | Not available in current release |

> **Team note:** Methods marked ⏸️ are built into the data model and ready to enable, but are **not available in the mobile app at this stage**. Do not promise them to customers yet.

---

## Sale Statuses

| Status | Meaning | Can Refund? |
|---|---|---|
| `pending` | Created, not yet finalized | ❌ |
| `completed` | Payment processed successfully | ✅ Full or partial |
| `partial_refund` | Some items were returned | ✅ Further partial refunds allowed |
| `refunded` | Entire sale refunded | ❌ Already fully refunded |
| `cancelled` | Sale voided | ❌ |

---

## Authentication

### Mobile App (OTP)
1. Enter phone number → receive OTP via **SMS** or **WhatsApp**
2. OTP valid for **5 minutes**, resend available after **60 seconds**, max **5 attempts**
3. On success: receives JWT access token (60 min) + refresh token (30 days)

### Admin Dashboard (Password)
- Owner sets a password once via the app
- Login at the admin dashboard with phone + password
- Token auto-refreshes in the background; session expires after 30 days of inactivity

---

## What the Admin Dashboard Supports

The web dashboard at `https://admin.amanapos.com` is intended for **owners** and **super-admins** only.

| Section | Who Sees It | What It Does |
|---|---|---|
| Dashboard Home | Owner + Admin | Revenue KPIs, sales chart, low-stock alerts |
| Sales | Owner + Admin | Sales history, refund initiation, refund KPI card |
| Products | Owner + Admin | Product & category management |
| Inventory | Owner + Admin | Stock levels, movements, batch/expiry management |
| Customers | Owner + Admin | Customer list, loyalty points |
| Users | Owner | Staff management (invite, deactivate) |
| Owners | Admin only | All owner accounts |
| Businesses | Admin only | All businesses, toggle active status |
| Subscriptions | Admin only | Manage all subscriptions |
| Plans | Admin only | Create and configure plans + feature flags |
| Activity Logs | Admin only | Full audit trail of platform actions |
| System | Admin only | Platform configuration |

---

## Common Support Scenarios

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Can't add more products" | Hit `max_products` plan limit | Upgrade plan or deactivate unused products |
| "Can't create a new shop" | Hit `max_shops` plan limit | Upgrade plan |
| "Can't invite more staff" | Hit `max_users` plan limit | Upgrade plan or deactivate inactive staff |
| "Receive Stock option is missing" | `inventory_inbound_receiving` not enabled on plan | Enable feature flag on their plan |
| "Stock not going down when we sell" | Business type is `restaurant` | Change business type to `shop` if they want inventory tracking |
| "Can't log into the web dashboard" | No password set, or wrong phone | Owner must set a password via the mobile app first |
| "Sale shows Partial Refund, customer wants full refund" | Previous partial refund was issued | Issue another refund for remaining items — backend validates remaining quantities |
| "OTP not arriving" | SMS or WhatsApp delivery issue | Ask customer to try the other channel; check if phone number is correct |
