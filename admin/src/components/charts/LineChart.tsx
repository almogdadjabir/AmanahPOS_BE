'use client';

import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export interface LineChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

interface LineChartProps {
  data:         LineChartDataPoint[];
  height?:      number;
  color?:       string;
  filled?:      boolean;
  showGrid?:    boolean;
  showTooltip?: boolean;
  showDots?:    boolean;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveDot({ cx, cy, fill }: any) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={7}   fill={fill} opacity={0.15} />
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
      <circle cx={cx} cy={cy} r={3}   fill={fill} />
      <circle cx={cx} cy={cy} r={1.5} fill="white" />
    </g>
  );
}

export default function LineChart({
  data,
  height      = 130,
  color       = '#0F766E',
  filled      = true,
  showGrid    = true,
  showTooltip = true,
  showDots    = true,
}: LineChartProps) {
  const margin = { top: 8, right: 4, left: -28, bottom: 0 };

  const sharedAxis = (
    <>
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
          cursor={{ stroke: 'hsl(215 22% 88%)', strokeWidth: 1.5 }}
        />
      )}
    </>
  );

  if (filled) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={margin}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          {sharedAxis}
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
        {sharedAxis}
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
