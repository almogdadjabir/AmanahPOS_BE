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
  | 'cash' | 'bankak' | 'card' | 'bank_transfer'
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
  bankak_account_snapshot: string;
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

export interface SalesShopBreakdown {
  shop_id: string;
  shop_name: string;
  count: number;
  total: string;
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

export interface InboundTransactionItem {
  id: string;
  product: string;
  product_name: string;
  quantity: string;
  unit_cost: string | null;
  expiry_date: string | null;
  batch_number: string;
}

export interface InboundTransaction {
  id: string;
  reference: string;
  notes: string;
  shop: string;
  shop_name: string;
  vendor: VendorMinimal | null;
  total_quantity: string;
  item_count: number;
  items: InboundTransactionItem[];
  created_by_name: string | null;
  created_at: string;
}

export interface PremiumInventorySummary {
  stock_items_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  active_vendors_count: number;
  inbound_this_month_count: number;
  received_quantity_this_month: string;
}

export interface ExpiryBatch {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  shop: string;
  shop_name: string;
  batch_number: string;
  quantity: string;
  expiry_date: string;
  days_remaining: number;
  is_expired: boolean;
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
  bankak_phone: string | null;
  bankak_name: string | null;
  enabled_features: Record<string, boolean>;
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

export interface VendorMinimal {
  id: string;
  name: string;
  phone: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessActiveSubscription {
  id: string;
  name: string;
  max_shops: number;
  max_products: number;
  max_users: number;
  features: Record<string, unknown>;
  is_free: boolean;
  price: string;
  currency: string;
  end_date: string;
  days_remaining: number;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  owner: UserProfile;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  active_subscription: BusinessActiveSubscription | null;
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

export type BusinessType = 'shop' | 'restaurant';

export interface AdminOwnerBusiness {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
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
  business_type: BusinessType;
  is_active: boolean;
  created_at: string;
  owner_name: string;
  owner_phone: string;
  shop_count: number;
  has_active_subscription: boolean;
  subscription_end_date: string | null;
}

export interface AdminBusinessShop {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AdminBusinessActiveSubscription {
  id: string;
  plan_id: string;
  plan_name: string;
  end_date: string;
  days_remaining: number;
}

export interface AdminBusinessDetail extends AdminBusiness {
  owner_id: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  updated_at: string;
  active_subscription: AdminBusinessActiveSubscription | null;
  shops: AdminBusinessShop[];
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

export interface AdminPlan {
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
  subscription_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminSubscriptionDetail {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_expired: boolean;
  days_remaining: number;
  payment_reference: string;
  notes: string;
  created_at: string;
  updated_at: string;
  business_id: string;
  business_name: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string;
  plan_name: string;
  plan_price: string;
  plan_currency: string;
  plan_duration: number;
  plan_is_free: boolean;
  max_shops: number;
  max_products: number;
  max_users: number;
}

export interface MonthlyGrowth {
  month: string;
  count: number;
}

export interface AdminRecentTransaction {
  id: string;
  receipt_number: string;
  business_name: string;
  shop_name: string;
  cashier_name: string;
  payment_method: PaymentMethod;
  net_amount: string;
  status: SaleStatus;
  created_at: string;
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
  recent_transactions: AdminRecentTransaction[];
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

// ── Activity Logs ────────────────────────────────────────────────────────────

export type ActivityAction =
  | 'owner_created' | 'owner_updated' | 'owner_activated' | 'owner_deactivated'
  | 'business_created' | 'business_updated' | 'business_activated' | 'business_deactivated'
  | 'subscription_created' | 'subscription_updated' | 'subscription_deactivated'
  | 'plan_created' | 'plan_updated' | 'plan_activated' | 'plan_deactivated';

export type ActivityEntityType = 'owner' | 'business' | 'subscription' | 'plan';

export interface ActivityLog {
  id:           string;
  action:       ActivityAction;
  action_label: string;
  entity_type:  ActivityEntityType;
  entity_id:    string;
  entity_label: string;
  description:  string;
  metadata:     Record<string, unknown>;
  actor_id:     string | null;
  actor_name:   string | null;
  actor_phone:  string | null;
  ip_address:   string | null;
  created_at:   string;
}

// ── Products ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  tenant: string;
  parent: string | null;
  name: string;
  description: string;
  image: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children: Category[];
}

export interface Product {
  id: string;
  tenant: string;
  shop: string;
  shop_name: string;
  category: string | null;
  category_name: string | null;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  price: string;
  cost_price: string;
  image: string | null;
  thumbnail_url: string | null;
  unit: string;
  is_active: boolean;
  track_inventory: boolean;
  min_stock_level: number;
  stock_level: number | null;
  created_at: string;
  updated_at: string;
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

// ── Notifications (admin) ────────────────────────────────────────────────────
export type NotifChannel = 'push' | 'sms' | 'both';
export type DeliveryStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type DeliveryChannel = 'push' | 'sms' | 'email';

export interface NotificationTemplate {
  id:         string;
  key:        string;
  name:       string;
  category:   string;
  channel:    NotifChannel;
  title_en:   string;
  body_en:    string;
  title_ar:   string;
  body_ar:    string;
  variables:  string[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSetting {
  key:         string;
  value:       string;
  description: string;
  updated_at:  string;
}

export interface DeliveryLog {
  id:                  string;
  channel:             DeliveryChannel;
  status:              DeliveryStatus;
  recipient_name:      string;
  recipient_phone:     string;
  notification_title:  string;
  sent_by_admin_name:  string | null;
  retry_count:         number;
  provider_message_id: string;
  error_message:       string;
  sent_at:             string | null;
  failed_at:           string | null;
  created_at:          string;
}
