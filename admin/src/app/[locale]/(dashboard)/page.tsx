import { getCurrentUser, isPlatformAdmin } from '@/services/auth';
import AdminOverview from './_overview/AdminOverview';
import OwnerOverview from './_overview/OwnerOverview';

export default async function DashboardPage() {
  const profile = await getCurrentUser();
  return isPlatformAdmin(profile)
    ? <AdminOverview />
    : <OwnerOverview />;
}
