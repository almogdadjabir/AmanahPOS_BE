import type { AdminOwner, AdminRecentTransaction } from "@/types/api";

export type AdminHealth = {
  status?: string;
  checks?: {
    database?: string;
    cache?: string;
  };
} | null;

export type AdminMonthlyGrowthItem = {
  month: string;
  count: number;
};

export type AdminStats = {
  total_owners: number;
  new_owners_this_month: number;
  total_businesses: number;
  total_shops: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  monthly_growth: AdminMonthlyGrowthItem[];
  recent_owners: AdminOwner[];
  recent_transactions: AdminRecentTransaction[];
} | null;

export type AdminPlan = {
  id: string | number;
  name: string;
  description: string;
  price: string;
  currency: string;
  duration_days: number;
  max_shops: number;
  max_users: number;
  is_free: boolean;
  is_active: boolean;
};
