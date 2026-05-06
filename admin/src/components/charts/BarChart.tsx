'use client';

import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface BarChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

interface BarChartProps {
  data:           BarChartDataPoint[];
  height?:        number;
  color?:         string;
  peakColor?:     string;
  showGrid?:      boolean;
  showTooltip?:   boolean;
  highlightPeak?: boolean;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-card-md text-[11px]">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-primary font-black text-sm mt-0.5">{payload[0].value.toLocaleString('en-US')}</p>
    </div>
  );
}

export default function BarChart({
  data,
  height        = 130,
  color         = '#5eead4',
  peakColor     = '#0F766E',
  showGrid      = true,
  showTooltip   = true,
  highlightPeak = true,
}: BarChartProps) {
  const maxVal    = Math.max(...data.map(d => d.value), 1);
  const peakLabel = highlightPeak ? data.reduce((a, b) => b.value > a.value ? b : a).label : null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} barCategoryGap="30%" barGap={4}
        margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
        {showGrid && (
          <CartesianGrid vertical={false} stroke="hsl(215 22% 91%)" strokeDasharray="0" />
        )}
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(215 16% 60%)', fontFamily: 'inherit' }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          tick={{ fontSize: 10, fill: 'hsl(215 16% 75%)', fontFamily: 'inherit' }}
          tickCount={4}
        />
        {showTooltip && (
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(215 28% 97%)', radius: 6 }}
          />
        )}
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
          {data.map(d => {
            const isPeak = d.label === peakLabel && d.value === maxVal;
            return (
              <Cell
                key={d.label}
                fill={isPeak ? peakColor : d.value > 0 ? color : 'hsl(215 22% 93%)'}
              />
            );
          })}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
