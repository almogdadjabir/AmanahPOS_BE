import { Suspense } from 'react';
import { getCurrentUser, isPlatformAdmin } from '@/services/auth';
import { fetchBusiness } from '@/services/owner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
import AdminOverview from './_overview/AdminOverview';
import OwnerOverview from './_overview/OwnerOverview';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const profile = await getCurrentUser();
  if (!profile) return null;
  if (isPlatformAdmin(profile)) return <AdminOverview />;

  const bizRes       = await fetchBusiness();
  const businessType = bizRes?.data?.[0]?.business_type;

  return (
    <ErrorBoundary fallback={<SectionError message="Failed to load dashboard. Try refreshing the page." />}>
      <Suspense fallback={null}>
        <OwnerOverview businessType={businessType} />
      </Suspense>
    </ErrorBoundary>
  );
}
