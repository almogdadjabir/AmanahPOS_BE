import { fetchSystemOverview } from '@/services/system';
import { getLocale } from 'next-intl/server';
import SystemHealthDashboard from './_components/SystemHealthDashboard';

export default async function SystemPage() {
  const [overview, locale] = await Promise.all([
    fetchSystemOverview(),
    getLocale(),
  ]);

  const now = new Date();
  const dateStr = now.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return <SystemHealthDashboard overview={overview} dateStr={dateStr} />;
}
