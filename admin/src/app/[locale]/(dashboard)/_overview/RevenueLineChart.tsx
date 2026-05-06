'use client';

import { LineChart } from '@/components/charts';
import type { DailyPoint } from '@/services/owner';

export default function RevenueLineChart({ data }: { data: DailyPoint[] }) {
  const points = data.map(d => ({ label: d.label, value: d.revenue }));
  return <LineChart data={points} height={160} filled color="#0F766E" />;
}
