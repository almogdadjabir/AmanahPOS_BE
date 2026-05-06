'use client';

import { BarChart } from '@/components/charts';

interface Props {
  data: { label: string; value: number }[];
}

export default function SalesBarChart({ data }: Props) {
  return (
    <BarChart
      data={data}
      height={120}
      color="#5eead4"
      peakColor="#0F766E"
      highlightPeak
    />
  );
}
