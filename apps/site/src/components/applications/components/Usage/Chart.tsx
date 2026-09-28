'use client';

import { useMemo } from 'react';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { processRealData } from './utils';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Spinner } from '@/components/ui/spinner';
import type { UsageDataPoint } from '@/types/portal-sdk';

interface ChartProps {
  loading?: boolean;
  startTime?: number;
  endTime?: number;
  data?: UsageDataPoint[];
}

const seriesColors = [
  '#9254de',
  '#1890ff',
  '#2f54eb',
  '#722ed1',
  '#0958d9',
  '#096dd9',
  '#531dab',
  '#389e0d',
];

const Chart: React.FC<ChartProps> = ({
  loading = false,
  startTime,
  endTime,
  data,
}) => {
  const { timeAxis, productNames, seriesData, totalCalls } = useMemo(
    () => processRealData(data, startTime, endTime),
    [data, startTime, endTime]
  );

  // Derive from the processed result, not the raw input: points whose
  // hour_timestamp falls outside the startTime/endTime window are dropped
  // during aggregation, which can leave `data` non-empty but every series at 0.
  const hasData = totalCalls > 0;

  // Product names come from API data and may contain spaces/parentheses,
  // which are not valid in a CSS custom property name (`--color-${key}`).
  // Use index-based keys for dataKey/config and keep the real name as the label.
  const seriesKeys = useMemo(
    () => productNames.map((_, index) => `series-${index}`),
    [productNames]
  );

  const chartData = useMemo(
    () =>
      timeAxis.map((time, index) => {
        const row: Record<string, string | number> = { time };
        productNames.forEach((name, seriesIndex) => {
          row[seriesKeys[seriesIndex]] = seriesData[name]?.[index] ?? 0;
        });
        return row;
      }),
    [timeAxis, productNames, seriesData, seriesKeys]
  );

  const chartConfig = useMemo(
    () =>
      productNames.reduce<ChartConfig>((config, name, index) => {
        config[seriesKeys[index]] = {
          label: name,
          color: seriesColors[index % seriesColors.length],
        };
        return config;
      }, {}),
    [productNames, seriesKeys]
  );

  if (loading) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex h-[500px] w-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg text-muted-foreground">No Data</p>
        <p className="max-w-md text-sm text-muted-foreground/70">
          No activity found for the selected products/credentials in the
          selected time range.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h3 className="text-base font-medium">Requests</h3>
        <p className="text-sm text-muted-foreground">
          Total requests: {totalCalls.toLocaleString()}
        </p>
      </div>
      <ChartContainer config={chartConfig} className="h-[440px] w-full">
        <BarChart accessibilityLayer data={chartData} margin={{ bottom: 24 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="time"
            tickLine={false}
            tickMargin={10}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
          <ChartTooltip
            content={(tooltipProps) => {
              // ChartTooltipContent filters out `type === 'none'` entries
              // before indexing, so mirror that here to find the true last
              // row instead of comparing against seriesKeys.length.
              const visiblePayload = (tooltipProps.payload ?? []).filter(
                (item) => item.type !== 'none'
              );
              const lastIndex = visiblePayload.length - 1;

              return (
                <ChartTooltipContent
                  active={tooltipProps.active}
                  payload={tooltipProps.payload}
                  label={tooltipProps.label}
                  formatter={(value, rawName, item, index) => {
                    const name = String(rawName);
                    const isLast = index === lastIndex;
                    const total = seriesKeys.reduce(
                      (sum, seriesKey) =>
                        sum + (Number(item.payload?.[seriesKey]) || 0),
                      0
                    );

                    return (
                      <>
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: `var(--color-${name})` }}
                        />
                        <div className="flex flex-1 items-center justify-between leading-none">
                          <span className="text-muted-foreground">
                            {chartConfig[name]?.label ?? name}
                          </span>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {Number(value).toLocaleString()}
                          </span>
                        </div>
                        {isLast && (
                          <div className="mt-1.5 flex basis-full items-center justify-between border-t border-border/50 pt-1.5 text-xs font-medium">
                            <span>Total requests</span>
                            <span className="font-mono tabular-nums">
                              {total.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  }}
                />
              );
            }}
          />
          <ChartLegend content={<ChartLegendContent />} />
          {seriesKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="total"
              fill={`var(--color-${key})`}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export default Chart;
