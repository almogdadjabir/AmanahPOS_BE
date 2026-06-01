'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ds/Skeleton';

const BarChart = dynamic(() => import('@/components/charts/BarChart'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

interface Props {
  data: { label: string; value: number }[];
}

export default function SalesBarChart({ data }: Props) {
  return (
    <BarChart
      data={data}
      height={120}
      color="#0F766E"
    />
  );
}
