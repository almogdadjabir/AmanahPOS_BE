'use server';

import { apiGet, ApiError } from '@/lib/api';
import type {
  Subscription, Plan, Business,
  ApiResponse, ApiList, StaffUser, Customer, Product,
} from '@/types/api';

export type { SubscriptionStatus } from '@/lib/subscription-utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OwnerUsage {
  current_staff:     number;
  current_customers: number;
  current_products:  number;
  current_shops:     number | null;
}

export type MySubscriptionResult =
  | { ok: true;  sub: Subscription | null; plans: Plan[] }
  | { ok: false; error: string };

export type OwnerUsageResult =
  | { ok: true;  data: OwnerUsage }
  | { ok: false; error: string };

// ── Fetch subscription + plans ────────────────────────────────────────────────

export async function fetchMySubscriptionAction(): Promise<MySubscriptionResult> {
  const [subResult, plansResult] = await Promise.allSettled([
    // Correct endpoint confirmed in services/owner.ts
    apiGet<ApiResponse<Subscription | null>>('/api/v1/subscriptions/current/'),
    apiGet<ApiResponse<Plan[]>>('/api/v1/subscriptions/plans/'),
  ]);

  let sub: Subscription | null = null;
  if (subResult.status === 'fulfilled') {
    sub = subResult.value?.data ?? null;
  } else {
    const err = subResult.reason;
    if (err instanceof ApiError) {
      if (err.status === 404) {
        sub = null; // no subscription — valid state
      } else {
        console.error('[my-subscription] subscription fetch failed', err.status, err.body);
        return { ok: false, error: `Failed to load subscription (${err.status})` };
      }
    } else {
      console.error('[my-subscription] network error', err);
      return { ok: false, error: 'Network error loading subscription' };
    }
  }

  const plans: Plan[] =
    plansResult.status === 'fulfilled'
      ? (plansResult.value?.data ?? [])
      : [];

  return { ok: true, sub, plans };
}

// ── Fetch owner usage ─────────────────────────────────────────────────────────

export async function fetchOwnerUsageAction(): Promise<OwnerUsageResult> {
  const [staffResult, customersResult, productsResult, businessResult] =
    await Promise.allSettled([
      apiGet<ApiResponse<StaffUser[]>>('/api/v1/users/'),
      apiGet<ApiList<Customer>>('/api/v1/customers/',         { limit: 1, page: 1 }),
      apiGet<ApiList<Product>>('/api/v1/products/',           { limit: 1, page: 1 }),
      // Business contains shop_count — confirmed in services/owner.ts
      apiGet<ApiResponse<Business[]>>('/api/v1/tenants/businesses/'),
    ]);

  const current_staff =
    staffResult.status === 'fulfilled'
      ? (staffResult.value?.data?.length ?? 0)
      : 0;

  const current_customers =
    customersResult.status === 'fulfilled'
      ? (customersResult.value?.count ?? 0)
      : 0;

  const current_products =
    productsResult.status === 'fulfilled'
      ? (productsResult.value?.count ?? 0)
      : 0;

  const current_shops: number | null =
    businessResult.status === 'fulfilled'
      ? (businessResult.value?.data?.[0]?.shop_count ?? null)
      : null;

  return {
    ok: true,
    data: { current_staff, current_customers, current_products, current_shops },
  };
}
