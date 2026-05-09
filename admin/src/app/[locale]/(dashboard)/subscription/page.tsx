import { Suspense } from 'react';
import PageTitle from '@/components/ds/PageTitle';
import {
  fetchMySubscriptionAction,
  fetchOwnerUsageAction,
} from '@/actions/my-subscription';
import { getSubscriptionStatus } from '@/lib/subscription-utils';
import SubscriptionAlerts from './_components/SubscriptionAlerts';
import SubscriptionHeroCard, { NoSubscriptionCard } from './_components/SubscriptionSummaryCard';
import SubscriptionUsage, { UsageUnavailable } from './_components/SubscriptionUsage';
import SubscriptionFeatures from './_components/SubscriptionFeatures';
import {
  SubscriptionSummarySkeleton,
} from './_components/SubscriptionSkeleton';

// Fetches subscription + usage in a single async pass so the two API calls
// are never duplicated. Previously HeroSection and BodySection each called
// fetchMySubscriptionAction() independently, causing /subscriptions/current/
// to be fetched twice per page render.
async function SubscriptionContent() {
  const [subResult, usageResult] = await Promise.all([
    fetchMySubscriptionAction(),
    fetchOwnerUsageAction(),
  ]);

  if (!subResult.ok) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-8 text-center mb-5">
        <p className="text-sm font-bold text-destructive">Failed to load subscription</p>
        <p className="text-xs text-destructive/70 mt-1">{subResult.error}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
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
  return (
    <div>
      <PageTitle
        title="My Subscription"
        description="Your current plan, usage, and billing details."
      />

      <Suspense fallback={<SubscriptionSummarySkeleton />}>
        <SubscriptionContent />
      </Suspense>
    </div>
  );
}
