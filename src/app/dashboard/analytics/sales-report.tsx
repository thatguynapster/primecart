"use client";

import { useState } from "react";

import { formatGhs } from "@/lib/format";
import type { DayBar, SalesGranularity } from "@/lib/dashboard/queries";

const TABS: { key: SalesGranularity; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

/**
 * Client-side only for the toggle — all three series are fetched server-side
 * up front (12.1's "daily / weekly / monthly view"), so switching tabs never
 * re-hits the database or shows a loading state.
 */
export function SalesReport({
  daily,
  weekly,
  monthly,
}: {
  daily: DayBar[];
  weekly: DayBar[];
  monthly: DayBar[];
}) {
  const [granularity, setGranularity] = useState<SalesGranularity>("daily");
  const series = { daily, weekly, monthly }[granularity];
  const max = Math.max(...series.map((bar) => bar.value), 1);
  const peak = series.reduce(
    (best, bar, index) => (bar.value > series[best].value ? index : best),
    0
  );
  const total = series.reduce((sum, bar) => sum + bar.value, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-nk-neutral-500">
          Total: <span className="font-medium text-nk-text">{formatGhs(total)}</span>
        </span>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setGranularity(tab.key)}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                granularity === tab.key
                  ? "border-nk-accent-600 bg-nk-accent-900 text-nk-accent-200"
                  : "border-nk-neutral-800 text-nk-neutral-400 hover:bg-nk-accent-900/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-57.5 items-end gap-2">
        {series.map((bar, index) => (
          <div
            key={`${granularity}-${index}`}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              style={{ height: (bar.value / max) * 210 }}
              className={`w-full rounded-sm ${
                index === peak && bar.value > 0 ? "bg-nk-accent-500" : "bg-nk-neutral-700"
              }`}
              title={`${bar.label}: ${formatGhs(bar.value)}`}
            />
            <span className="truncate text-xs text-nk-neutral-600">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
