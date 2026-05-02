'use client';

import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Dot,
} from 'recharts';

export interface LineChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  height?: number;
  color?: string;
  filled?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showDots?: boolean;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border-soft rounded-lg px-2.5 py-1.5 shadow-lg text-[11px]">
      <p className="font-semibold text-text-primary">{label}</p>
      <p className="text-primary font-bold">{payload[0].value}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveDot({ cx, cy, fill }: any) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={fill} opacity={0.15} />
      <circle cx={cx} cy={cy} r={3.5} fill={fill} />
      <circle cx={cx} cy={cy} r={1.8} fill="white" />
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StaticDot({ cx, cy, fill, value }: any) {
  if (!value) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={3.5} fill={fill} />
      <circle cx={cx} cy={cy} r={1.8} fill="white" />
    </g>
  );
}

export default function LineChart({
  data,
  height = 130,
  color = '#0F766E',
  filled = true,
  showGrid = true,
  showTooltip = true,
  showDots = true,
}: LineChartProps) {
  const margin = { top: 16, right: 4, left: -28, bottom: 0 };
  const axis = (
    <>
      {showGrid && (
        <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="0" />
      )}
      <XAxis
        dataKey="label"
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8', fontFamily: 'system-ui' }}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        allowDecimals={false}
        tick={{ fontSize: 10, fill: '#CBD5E1', fontFamily: 'system-ui' }}
        tickCount={4}
      />
      {showTooltip && <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />}
    </>
  );

  if (filled) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={margin}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.12} />
              <stop offset="100%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          {axis}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill="url(#areaFill)"
            dot={showDots ? <StaticDot fill={color} /> : false}
            activeDot={<ActiveDot fill={color} />}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={margin}>
        {axis}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={showDots ? <StaticDot fill={color} /> : false}
          activeDot={<ActiveDot fill={color} />}
        />
      </ReLineChart>
    </ResponsiveContainer>
  );
}
