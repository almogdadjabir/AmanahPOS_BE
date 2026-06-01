'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations, useLocale } from 'next-intl';
import type { MonthlyGrowth } from '@/types/api';
import { ChartSkeleton } from '@/components/ds/Skeleton';
import { BarChart2, TrendingUp } from 'lucide-react';

const BarChart  = dynamic(() => import('@/components/charts/BarChart'),  { ssr: false, loading: () => <ChartSkeleton /> });
const LineChart = dynamic(() => import('@/components/charts/LineChart'), { ssr: false, loading: () => <ChartSkeleton /> });
import { cn } from '@/lib/utils';

type ChartType = 'bar' | 'line';
type Props = { data: MonthlyGrowth[] };

export default function GrowthChartToggle({ data }: Props) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [type, setType] = useState<ChartType>('bar');

  const chartData = useMemo(() => {
    const months = last6Months();
    return months.map(month => ({
      label: formatMonth(month, locale),
      value: data.find(item => item.month === month)?.count ?? 0,
    }));
  }, [data, locale]);

  const total   = chartData.reduce((sum, item) => sum + item.value, 0);
  const peak    = chartData.reduce((a, b) => b.value > a.value ? b : a);
  const hasData = total > 0;

  return (
    <div>
      {/* Fix #16: peak info on its own line on the LEFT, toggle alone on RIGHT — no crowding */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          {/* Fix #7: font-semibold 27px tight tracking */}
          <p className="text-[27px] font-semibold text-foreground leading-none tabular-nums tracking-[-.03em] num">
            {total.toLocaleString('en-US')}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {t('growth.last6Months')}
          </p>
          {/* Fix #16: peak on its own line below the subtext */}
          {hasData && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {t('growth.peak')}{' '}
              <span className="font-semibold text-foreground">
                {peak.label} · {peak.value.toLocaleString('en-US')}
              </span>
            </p>
          )}
        </div>

        {/* Toggle alone on the right — no peak crowding */}
        <ChartTypeToggle value={type} onChange={setType} />
      </div>

      {/* Fix #10: single teal color, no peak highlighting */}
      {type === 'bar'
        ? <BarChart data={chartData} height={140} color="#0F766E" highlightPeak={false} />
        : <LineChart data={chartData} height={140} filled />
      }
    </div>
  );
}

function ChartTypeToggle({ value, onChange }: { value: ChartType; onChange: (v: ChartType) => void }) {
  const t = useTranslations('dashboard');
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 shrink-0">
      {([['bar', BarChart2], ['line', TrendingUp]] as const).map(([type, Icon]) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
            '[&_svg]:size-3',
            value === type
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon />
          {type === 'bar' ? t('growth.bar') : t('growth.line')}
        </button>
      ))}
    </div>
  );
}

function formatMonth(month: string, locale: string) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1).toLocaleString(locale, { month: 'short' });
}

function last6Months(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}
