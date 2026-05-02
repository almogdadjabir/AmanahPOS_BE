import { getCurrentUser } from '@/services/auth';
import AppShell from '@/components/layout/AppShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUser();
  return <AppShell profile={profile}>{children}</AppShell>;
}
