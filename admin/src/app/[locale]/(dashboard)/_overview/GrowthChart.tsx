"use client";

import { useMemo, useState } from "react";
import type { MonthlyGrowth } from "@/types/api";
import { BarChart, LineChart } from "@/components/charts";

type ChartType = "bar" | "line";

type Props = {
  data: MonthlyGrowth[];
};

export default function GrowthChartToggle({ data }: Props) {
  const [type, setType] = useState<ChartType>("bar");

  const chartData = useMemo(() => {
    const months = last6Months();

    return months.map((month) => ({
      label: formatMonth(month),
      value: data.find((item) => item.month === month)?.count ?? 0,
    }));
  }, [data]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;

  const peak = chartData.reduce((currentPeak, item) =>
    item.value > currentPeak.value ? item : currentPeak,
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[24px] font-black leading-none text-text-primary tabular-nums">
            {total.toLocaleString("en-US")}
          </p>
          <p className="mt-1 text-xs text-text-hint">
            new owners in this period
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ChartTypeToggle value={type} onChange={setType} />

          {hasData ? (
            <p className="text-[11px] text-text-hint">
              Peak{" "}
              <span className="font-bold text-primary">
                {peak.label} · {peak.value.toLocaleString("en-US")}
              </span>
            </p>
          ) : (
            <p className="text-[11px] italic text-text-hint">
              No registrations yet
            </p>
          )}
        </div>
      </div>

      {type === "bar" ? (
        <BarChart data={chartData} height={130} highlightPeak />
      ) : (
        <LineChart data={chartData} height={130} filled />
      )}
    </div>
  );
}

function ChartTypeToggle({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (value: ChartType) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-surface-soft p-0.5">
      <button
        type="button"
        onClick={() => onChange("bar")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
          value === "bar"
            ? "bg-white text-text-primary shadow-sm"
            : "text-text-hint hover:text-text-secondary"
        }`}
      >
        <BarIcon />
        Bar
      </button>

      <button
        type="button"
        onClick={() => onChange("line")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
          value === "line"
            ? "bg-white text-text-primary shadow-sm"
            : "text-text-hint hover:text-text-secondary"
        }`}
      >
        <LineIcon />
        Line
      </button>
    </div>
  );
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(year, monthNumber - 1).toLocaleString("en", {
    month: "short",
  });
}

function last6Months(): string[] {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
  });
}

function BarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
      <rect x="0" y="4" width="3" height="8" rx="1" opacity="0.5" />
      <rect x="4.5" y="1" width="3" height="11" rx="1" />
      <rect x="9" y="6" width="3" height="6" rx="1" opacity="0.5" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="0,10 3,5 6,7 9,2 12,4" />
    </svg>
  );
}
