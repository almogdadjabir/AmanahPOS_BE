'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MonthlyGrowth } from '@/types/api';
import { ChartSkeleton } from '@/components/ds/Skeleton';
import { BarChart2, TrendingUp } from 'lucide-react';

const BarChart  = dynamic(() => import('@/components/charts/BarChart'),  { ssr: false, loading: () => <ChartSkeleton /> });
const LineChart = dynamic(() => import('@/components/charts/LineChart'), { ssr: false, loading: () => <ChartSkeleton /> });
import { cn } from '@/lib/utils';

type ChartType = 'bar' | 'line';
type Props = { data: MonthlyGrowth[] };

export default function GrowthChartToggle({ data }: Props) {
  const [type, setType] = useState<ChartType>('bar');

  const chartData = useMemo(() => {
    const months = last6Months();
    return months.map(month => ({
      label: formatMonth(month),
      value: data.find(item => item.month === month)?.count ?? 0,
    }));
  }, [data]);

  const total   = chartData.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;
  const peak    = chartData.reduce((a, b) => b.value > a.value ? b : a);

  return (
    <div>
      {/* Chart header row */}
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[28px] font-black text-foreground leading-none tabular-nums">
            {total.toLocaleString('en-US')}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            new owners in the last 6 months
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ChartTypeToggle value={type} onChange={setType} />
          {hasData ? (
            <p className="text-[11px] text-muted-foreground">
              Peak{' '}
              <span className="font-bold text-primary">
                {peak.label} · {peak.value.toLocaleString('en-US')}
              </span>
            </p>
          ) : (
            <p className="text-[11px] italic text-muted-foreground">No registrations yet</p>
          )}
        </div>
      </div>

      {type === 'bar'
        ? <BarChart data={chartData} height={140} highlightPeak />
        : <LineChart data={chartData} height={140} filled />
      }
    </div>
  );
}

function ChartTypeToggle({ value, onChange }: { value: ChartType; onChange: (v: ChartType) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {([['bar', BarChart2], ['line', TrendingUp]] as const).map(([type, Icon]) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
            '[&_svg]:size-3',
            value === type
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon />
          {type === 'bar' ? 'Bar' : 'Line'}
        </button>
      ))}
    </div>
  );
}

function formatMonth(month: string) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1).toLocaleString('en', { month: 'short' });
}

function last6Months(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}
