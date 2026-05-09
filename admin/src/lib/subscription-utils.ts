import type { Subscription } from '@/types/api';

export type SubscriptionStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'inactive'
  | 'demo'
  | 'none';

export function getSubscriptionStatus(sub: Subscription | null): SubscriptionStatus {
  if (!sub)                    return 'none';
  if (sub.plan.is_free)        return 'demo';
  if (sub.is_expired)          return 'expired';
  if (!sub.is_active)          return 'inactive';
  if (sub.days_remaining <= 7) return 'expiring_soon';
  return 'active';
}

export function isSubscriptionBlocked(status: SubscriptionStatus): boolean {
  return status === 'expired' || status === 'inactive' || status === 'none';
}
