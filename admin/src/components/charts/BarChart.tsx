"use client";

import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface BarChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  height?: number;
  // Fix #10: single teal default — no more two-color mint/teal split
  color?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  // Fix #10: highlightPeak removed from meaningful use — all bars same color
  highlightPeak?: boolean;
}

function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${Number((value / 1_000_000_000).toFixed(1))}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${Number((value / 1_000_000).toFixed(1))}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Number((value / 1_000).toFixed(1))}K`;
  }
  return String(value);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-[11px]">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-primary font-semibold text-sm mt-0.5 tabular-nums">
        {payload[0].value.toLocaleString("en-US")}
      </p>
    </div>
  );
}

export default function BarChart({
  data,
  height = 130,
  color = "#0F766E",   // Fix #10: single brand teal
  showGrid = true,
  showTooltip = true,
  highlightPeak = false,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart
        data={data}
        barCategoryGap="30%"
        barGap={4}
        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
      >
        {showGrid && (
          <CartesianGrid
            vertical={false}
            stroke="#ECEEF1"
            strokeDasharray="0"
          />
        )}
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: 10,
            fontWeight: 500,
            fill: "#AEB6C2",
            fontFamily: "inherit",
          }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={36}
          tickFormatter={(value) => formatCompactNumber(Number(value))}
          tick={{
            fontSize: 10,
            fill: "#AEB6C2",
            fontFamily: "inherit",
          }}
          tickCount={4}
        />
        {showTooltip && (
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "#F4F5F7", radius: 6 }}
          />
        )}
        {/* Fix #10: all bars teal; 0-value bars get a 3px gray baseline tick via minPointSize */}
        <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={44} minPointSize={3}>
          {data.map((d) => (
            <Cell
              key={d.label}
              fill={d.value === 0 ? "#E1E4E9" : color}
            />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
