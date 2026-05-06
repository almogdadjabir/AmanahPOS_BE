import { Suspense } from 'react';
import PlansDrawerShell from './_components/PlansDrawerShell';
import PlansPageHeader from './_components/PlansPageHeader';
import PlansList from './_components/PlansList';
import { CardGridSkeleton } from '@/components/ds/Skeleton';

export default function PlansPage() {
  return (
    <PlansDrawerShell>
      <div>
        <PlansPageHeader />

        <Suspense fallback={<CardGridSkeleton cards={6} />}>
          <PlansList />
        </Suspense>
      </div>
    </PlansDrawerShell>
  );
}
