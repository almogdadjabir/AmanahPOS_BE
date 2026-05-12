// Central registry of all fetch cache tags.
// Use these constants in both withUserCache tags arrays and revalidateTag calls
// to prevent silent mismatches (revalidateTag is case-sensitive).
export const CACHE_TAGS = {
  sales:         'sales',
  salesSummary:  'sales-summary',
  subscription:  'subscription',
  subscriptions: 'subscriptions',
  inventory:     'inventory',
  owners:        'owners',
  businesses:    'businesses',
  customers:     'customers',
  staff:         'staff',
  products:      'products',
  users:         'users',
  overview:      'overview',
  plans:         'plans',
  stats:         'stats',
  profile:       'profile',
  activityLogs:  'activity-logs',
  notifications: 'notifications',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
