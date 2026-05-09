import { Bone } from '@/components/ds/Skeleton';
import {
  SubscriptionSummarySkeleton,
  SubscriptionBodySkeleton,
} from './_components/SubscriptionSkeleton';

export default function SubscriptionLoading() {
  return (
    <div>
      {/* PageTitle */}
      <div className="mb-5 space-y-1.5">
        <Bone className="h-7 w-40" />
        <Bone className="h-3.5 w-64" />
      </div>

      <SubscriptionSummarySkeleton />
      <SubscriptionBodySkeleton />
    </div>
  );
}
