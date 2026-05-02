// ── Standard API envelope ────────────────────────────────────────────────────
export interface ApiList<T> {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ── Sales ────────────────────────────────────────────────────────────────────
export type PaymentMethod =
  | 'cash' | 'card' | 'bank_transfer'
  | 'mobile_wallet' | 'loyalty_points' | 'split' | 'credit';

export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded' | 'partial_refund';

export interface SaleItem {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  quantity: string;
  unit_price: string;
  discount: string;
  subtotal: string;
}

export interface Sale {
  id: string;
  tenant: string;
  shop: string;
  shop_name: string;
  cashier: string;
  cashier_name: string;
  customer: string | null;
  customer_name: string | null;
  receipt_number: string;
  total_amount: string;
  discount_amount: string;
  tax_amount: string;
  net_amount: string;
  payment_method: PaymentMethod;
  status: SaleStatus;
  notes: string;
  item_count: number;
  items: SaleItem[];
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesSummary {
  total_sales: number;
  total_revenue: string;
  total_discount: string;
  total_tax: string;
  avg_sale_value: string;
}

// ── Inventory ────────────────────────────────────────────────────────────────
export type MovementType =
  | 'in' | 'out' | 'adjustment' | 'sale' | 'return'
  | 'transfer_in' | 'transfer_out' | 'opening';

export interface StockLevel {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  shop: string;
  shop_name: string;
  quantity: string;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product: string;
  product_name: string;
  shop: string;
  shop_name: string;
  movement_type: MovementType;
  quantity: string;
  reference: string;
  notes: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

// ── Users ────────────────────────────────────────────────────────────────────
export type UserRole = 'owner' | 'manager' | 'cashier';

export interface StaffUser {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  default_shop_id: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  is_staff: boolean;
  is_verified: boolean;
  has_password: boolean;
  business_id: string | null;
  default_shop_id: string | null;
  created_at: string;
  last_login_at: string | null;
}

// ── Customers ────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  tenant: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  loyalty_points: number;
  notes: string;
  is_active: boolean;
  total_purchases: string;
  created_at: string;
  updated_at: string;
}

// ── Tenants ──────────────────────────────────────────────────────────────────
export interface Shop {
  id: string;
  business: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  owner: UserProfile;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  subscription_plan: string | null;
  is_active: boolean;
  shop_count: number;
  shops: Shop[];
  created_at: string;
  updated_at: string;
}

// ── Admin panel ───────────────────────────────────────────────────────────────

export interface AdminOwner {
  id: string;
  phone: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  business_count: number;
  has_active_subscription: boolean;
}

export interface AdminOwnerShop {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminOwnerBusiness {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  shop_count: number;
  shops: AdminOwnerShop[];
  active_subscription: {
    id: string;
    plan_name: string;
    end_date: string;
    days_remaining: number;
  } | null;
}

export interface AdminOwnerDetail extends AdminOwner {
  email: string | null;
  has_password: boolean;
  updated_at: string;
  businesses: AdminOwnerBusiness[];
}

export interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  owner_name: string;
  owner_phone: string;
  shop_count: number;
  has_active_subscription: boolean;
  subscription_end_date: string | null;
}

export interface AdminSubscription {
  id: string;
  business_name: string;
  owner_name: string;
  owner_phone: string;
  plan_name: string;
  plan_price: string;
  plan_currency: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_expired: boolean;
  days_remaining: number;
  payment_reference: string;
  created_at: string;
}

export interface MonthlyGrowth {
  month: string;
  count: number;
}

export interface AdminStats {
  total_owners: number;
  total_businesses: number;
  total_shops: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  new_owners_this_month: number;
  monthly_growth: MonthlyGrowth[];
  recent_owners: AdminOwner[];
}

// Paginated admin list response
export interface AdminList<T> {
  success: boolean;
  data: {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
  };
}

// ── Subscriptions ────────────────────────────────────────────────────────────
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  max_shops: number;
  max_products: number;
  max_users: number;
  duration_days: number;
  features: Record<string, unknown>;
  is_active: boolean;
  is_free: boolean;
  sort_order: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  business: string;
  plan: Plan;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_expired: boolean;
  days_remaining: number;
  payment_reference: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}
