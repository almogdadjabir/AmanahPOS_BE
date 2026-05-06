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
  SubscriptionBodySkeleton,
} from './_components/SubscriptionSkeleton';

// ── Async slices ──────────────────────────────────────────────────────────────

async function HeroSection() {
  const result = await fetchMySubscriptionAction();

  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-8 text-center mb-5">
        <p className="text-sm font-bold text-destructive">Failed to load subscription</p>
        <p className="text-xs text-destructive/70 mt-1">{result.error}</p>
      </div>
    );
  }

  const { sub } = result;
  const status  = getSubscriptionStatus(sub);

  return (
    <>
      <SubscriptionAlerts
        status={status}
        daysRemaining={sub?.days_remaining}
        planName={sub?.plan.name}
      />
      {sub
        ? <SubscriptionHeroCard sub={sub} status={status} />
        : <NoSubscriptionCard />
      }
    </>
  );
}

async function BodySection() {
  const [subResult, usageResult] = await Promise.all([
    fetchMySubscriptionAction(),
    fetchOwnerUsageAction(),
  ]);

  if (!subResult.ok || !subResult.sub) return null;

  const { sub } = subResult;
  const plan    = sub.plan;
  const features = plan.features ?? {};
  const hasFeatures = Object.keys(features).length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Usage — takes 2/3 */}
      <div className="lg:col-span-2">
        {usageResult.ok
          ? <SubscriptionUsage usage={usageResult.data} plan={plan} />
          : <UsageUnavailable plan={plan} />
        }
      </div>

      {/* Features sidebar — takes 1/3 */}
      {hasFeatures && (
        <div className="lg:col-span-1">
          <SubscriptionFeatures features={features} />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SubscriptionPage() {
  return (
    <div>
      <PageTitle
        title="My Subscription"
        description="Your current plan, usage, and billing details."
      />

      <Suspense fallback={<SubscriptionSummarySkeleton />}>
        <HeroSection />
      </Suspense>

      <Suspense fallback={<SubscriptionBodySkeleton />}>
        <BodySection />
      </Suspense>
    </div>
  );
}
