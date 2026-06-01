import { Suspense } from 'react';
import { getLocale } from 'next-intl/server';
import {
  fetchMySubscriptionAction,
  fetchOwnerUsageAction,
} from '@/actions/my-subscription';
import { getSubscriptionStatus } from '@/lib/subscription-utils';
import SubscriptionAlerts from './_components/SubscriptionAlerts';
import SubscriptionHeroCard, { NoSubscriptionCard } from './_components/SubscriptionSummaryCard';
import SubscriptionUsage, { UsageUnavailable } from './_components/SubscriptionUsage';
import SubscriptionFeatures from './_components/SubscriptionFeatures';
import { SubscriptionSummarySkeleton } from './_components/SubscriptionSkeleton';
import { AlertTriangle } from 'lucide-react';

async function SubscriptionContent() {
  const [subResult, usageResult] = await Promise.all([
    fetchMySubscriptionAction(),
    fetchOwnerUsageAction(),
  ]);

  if (!subResult.ok) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-xs p-8 flex flex-col items-center text-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <AlertTriangle className="size-4 text-muted-foreground" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Failed to load subscription</p>
          <p className="text-[11px] text-muted-foreground mt-1">{subResult.error}</p>
        </div>
      </div>
    );
  }

  const { sub } = subResult;
  const status   = getSubscriptionStatus(sub);

  return (
    <>
      <SubscriptionAlerts
        status={status}
        daysRemaining={sub?.days_remaining}
        planName={sub?.plan.name}
      />

      {sub ? <SubscriptionHeroCard sub={sub} status={status} /> : <NoSubscriptionCard />}

      {sub && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2">
            {usageResult.ok
              ? <SubscriptionUsage usage={usageResult.data} plan={sub.plan} />
              : <UsageUnavailable plan={sub.plan} />
            }
          </div>
          {Object.keys(sub.plan.features ?? {}).length > 0 && (
            <div className="lg:col-span-1">
              <SubscriptionFeatures features={sub.plan.features ?? {}} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default async function SubscriptionPage() {
  const locale = await getLocale();
  const dateStr = new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h1 className="text-[21px] font-semibold text-foreground tracking-[-.025em] leading-tight">
          My Subscription
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">{dateStr}</p>
      </div>

      <Suspense fallback={<SubscriptionSummarySkeleton />}>
        <SubscriptionContent />
      </Suspense>
    </div>
  );
}
