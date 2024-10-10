"use client";

import React from "react";
import {
  LineChart as Line_Chart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { classNames } from "@/lib/helpers";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import clsx from "clsx";

type Props = {
  chartData: { name: string; revenue: number; orders: number }[];
  chartConfig: ChartConfig;
  height?: number;
};

const LineChart = ({ chartData: data, chartConfig, height }: Props) => {
  return (
    <div
      className={clsx(
        "flex flex-col w-full transition-all",
        height ? "gap-4" : "gap-24"
      )}
    >
      {!data.length ? (
        <div className="flex flex-1 items-center justify-center">
          No Data to display
        </div>
      ) : (
        <>
          <div className="flex gap-4">
            {Object.entries(chartConfig).map(([_, { label, color }], i) => (
              <div key={i} className="flex gap-2 items-center">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <p className="text-sm font-medium capitalize">{label}</p>
              </div>
            ))}
          </div>

          <ChartContainer
            config={chartConfig}
            className="min-h-[200px] max-h-[340px] w-full"
            style={{ height: height ?? "inherit" }}
          >
            <Line_Chart accessibilityLayer {...{ data }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                stroke="currentColor"
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                dataKey={"revenue"}
                axisLine={false}
                tickLine={false}
                stroke="currentColor"
                padding={{ top: 8, bottom: 8 }}
              />
              <Tooltip content={<CustomTooltip />} />

              {Object.keys(chartConfig).map((key) => (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotoneX"
                  stroke={chartConfig[key].color}
                  fill={chartConfig[key].color}
                  strokeWidth={3}
                  dot={{ r: data.length > 1 ? 0 : 5 }}
                  activeDot={{
                    r: 10,
                    fill: chartConfig[key].color,
                    strokeWidth: 0,
                  }}
                />
              ))}
            </Line_Chart>
          </ChartContainer>
        </>
      )}
    </div>
  );
};

export default LineChart;

type TooltipProps = {
  payload?: any;
};

const CustomTooltip = ({ payload }: TooltipProps) => {
  return (
    <div className="flex flex-col bg-light dark:bg-dark border rounded-lg px-5 py-2">
      {payload.map((pl: any, i: any) => (
        <div key={i} className="flex gap-2.5 items-center">
          <div
            style={{ backgroundColor: pl.color }}
            className={classNames("w-3.5 h-3.5 rounded-full")}
          ></div>
          <p className="text-sm font-medium">
            {pl.dataKey === "revenue" && "$"}
            {pl.value.toFixed(pl.dataKey === "revenue" ? 2 : 0)}
          </p>
        </div>
      ))}
    </div>
  );
};
