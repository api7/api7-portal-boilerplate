'use client';

import { useEffect, useMemo, useRef } from 'react';

import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { cloneDeep } from 'lodash-es';
import { useTheme } from 'next-themes';

import { processRealData } from './utils';
import type { UsageDataPoint } from '@/types/portal-sdk';

interface ChartProps {
  loading?: boolean;
  startTime?: number;
  endTime?: number;
  data?: UsageDataPoint[];
}

const coolColors = [
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
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  // Theme-aware colors so the chart (and its loading mask) match the app theme
  // instead of flashing the ECharts default light palette in dark mode.
  const textColor = isDark ? '#e5e5e5' : '#333333';
  const axisLineColor = isDark ? 'rgba(255,255,255,0.25)' : '#cccccc';
  const splitLineColor = isDark ? 'rgba(255,255,255,0.1)' : '#eeeeee';
  const maskColor = isDark ? 'rgba(38,38,38,0.6)' : 'rgba(255,255,255,0.8)';

  // Process data
  const { timeAxis, productNames, seriesData, totalCalls } = processRealData(
    data,
    startTime,
    endTime
  );

  const reversedProductNames = useMemo(
    () => cloneDeep(productNames).reverse(),
    [productNames]
  );

  // Show empty state if no data
  const hasData = data && data.length > 0;

  // Stacked bar chart configuration
  const getChartOption = (): EChartsOption => {
    if (!hasData) {
      return {
        title: {
          text: 'No Data',
          subtext:
            'No activity found for the selected products/credentials in the selected time range.',
          left: 'center',
          top: 'middle',
          textStyle: {
            fontSize: 18,
            color: '#999',
          },
          subtextStyle: {
            fontSize: 14,
            color: '#ccc',
          },
        },
        grid: {
          show: false,
        },
        xAxis: {
          show: false,
        },
        yAxis: {
          show: false,
        },
      };
    }

    const series = productNames.map((productName) => ({
      name: productName,
      type: 'bar' as const,
      stack: 'total',
      emphasis: {
        focus: 'series' as const,
      },
      data: seriesData[productName],
    }));

    return {
      color: coolColors,
      textStyle: {
        color: textColor,
      },
      title: {
        text: 'Requests',
        subtext: `Total requests: ${totalCalls.toLocaleString()}`,
        left: 'center',
        textStyle: {
          color: textColor,
        },
        subtextStyle: {
          color: isDark ? '#9ca3af' : '#999999',
        },
      },

      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: function (params: unknown) {
          const paramsArray = params as Array<{
            axisValue: string;
            seriesName: string;
            marker: string;
            value: number;
          }>;
          let result = `<div style="text-align: center; margin-bottom: 8px;"><strong>${paramsArray[0].axisValue}</strong></div>`;
          let totalValue = 0;

          // Maintain the same order as productNames
          reversedProductNames.forEach((productName) => {
            const param = paramsArray.find(
              (p) => p.seriesName === productName
            );
            if (param) {
              result += `<div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0; white-space: nowrap;">
                <span style="display: flex; align-items: center;">${
                  param.marker
                }${param.seriesName}</span>
                <span style="font-weight: bold; margin-left: 16px;">${param.value.toLocaleString()}</span>
              </div>`;
              totalValue += param.value;
            }
          });

          result += `<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; white-space: nowrap;">
            <span style="font-weight: bold;">Total requests</span>
            <span style="font-weight: bold; margin-left: 16px;">${totalValue.toLocaleString()}</span>
          </div>`;

          return result;
        },
      },
      legend: {
        data: reversedProductNames,
        bottom: 10,
        textStyle: {
          color: textColor,
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: timeAxis,
        axisLabel: {
          rotate: 30,
          color: textColor,
          formatter: function (value: string) {
            return value;
          },
        },
        axisLine: {
          lineStyle: { color: axisLineColor },
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: {
          color: textColor,
          formatter: '{value}',
        },
        axisLine: {
          lineStyle: { color: axisLineColor },
        },
        splitLine: {
          lineStyle: { color: splitLineColor },
        },
      },
      series,
    };
  };

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = getChartOption();

    // Set loading state
    if (loading) {
      chartInstance.current.showLoading({
        text: 'Loading...',
        color: '#1890ff',
        textColor: textColor,
        maskColor: maskColor,
        zlevel: 0,
      });
    } else {
      chartInstance.current.hideLoading();
      chartInstance.current.setOption(option);
    }

    // Responsive handling
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, startTime, endTime, data, resolvedTheme]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: '500px',
        minHeight: '500px',
      }}
    />
  );
};

export default Chart;
