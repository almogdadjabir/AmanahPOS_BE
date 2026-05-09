'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ds/Skeleton';
import type { DailyPoint } from '@/services/owner';

const LineChart = dynamic(() => import('@/components/charts/LineChart'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export default function RevenueLineChart({ data }: { data: DailyPoint[] }) {
  const points = data.map(d => ({ label: d.label, value: d.revenue }));
  return <LineChart data={points} height={160} filled color="#0F766E" />;
}
