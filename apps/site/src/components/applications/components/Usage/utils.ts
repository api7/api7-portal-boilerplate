import dayjs from 'dayjs';

import type { UsageDataPoint } from '@/types/portal-sdk';

export interface ChartProcessedData {
  timeAxis: string[];
  productNames: string[];
  seriesData: { [productName: string]: number[] };
  totalCalls: number;
}

// Helper function to create unique product key
export const getProductKey = (item: UsageDataPoint): string => {
  return item.api_product_id
    ? `${item.api_product_name}|${item.api_product_id}`
    : item.api_product_name;
};

// Create product mapping with correct duplicate detection
export const createProductMapping = (data: UsageDataPoint[]) => {
  // First, collect all unique products
  const productInfoMap = new Map<string, { name: string; id?: string }>();

  data.forEach((item) => {
    const key = getProductKey(item);
    if (!productInfoMap.has(key)) {
      productInfoMap.set(key, {
        name: item.api_product_name,
        id: item.api_product_id,
      });
    }
  });

  // Count how many different products have the same name
  const nameToProductsMap = new Map<string, string[]>();
  productInfoMap.forEach((info, key) => {
    if (!nameToProductsMap.has(info.name)) {
      nameToProductsMap.set(info.name, []);
    }
    nameToProductsMap.get(info.name)?.push(key);
  });

  // Create display names - only add ID if there are multiple products with same name
  const keyToDisplayName = new Map<string, string>();
  productInfoMap.forEach((info, key) => {
    const productsWithSameName = nameToProductsMap.get(info.name);
    const hasMultipleWithSameName =
      productsWithSameName && productsWithSameName.length > 1;

    const displayName =
      hasMultipleWithSameName && info.id
        ? `${info.name} (${info.id})`
        : info.name;
    keyToDisplayName.set(key, displayName);
  });

  return {
    keyToDisplayName,
    productKeys: Array.from(productInfoMap.keys()),
    displayNames: Array.from(keyToDisplayName.values()),
  };
};

// Process real data based on time range and hour_timestamp aggregation
export function processRealData(
  data: UsageDataPoint[] | undefined,
  startTime?: number, // unix timestamp
  endTime?: number // unix timestamp
): ChartProcessedData {
  if (!data || data.length === 0) {
    return {
      timeAxis: [],
      productNames: [],
      seriesData: {},
      totalCalls: 0,
    };
  }

  const startTimestamp = startTime ? startTime * 1000 : undefined; // convert to milliseconds
  const endTimestamp = endTime ? endTime * 1000 : undefined; // convert to milliseconds
  const { keyToDisplayName, displayNames } = createProductMapping(data);

  // Determine time range - if greater than 24 hours, aggregate by day; otherwise display by hour
  const isMultipleDays =
    startTimestamp &&
    endTimestamp &&
    dayjs(endTimestamp).diff(dayjs(startTimestamp), 'hour') > 24;

  if (isMultipleDays) {
    // Multi-day data: aggregate by day
    const start = dayjs(startTimestamp);
    const end = dayjs(endTimestamp);
    const diffDays = end.diff(start, 'day');

    // Generate date time axis
    const timeAxis: string[] = [];
    const dateMap = new Map<string, number>(); // date string -> index

    for (let i = 0; i <= diffDays; i++) {
      const date = start.add(i, 'day');
      const dateKey = date.format('MM-DD');
      timeAxis.push(dateKey);
      dateMap.set(date.format('YYYY-MM-DD'), i);
    }

    // Initialize series data
    const seriesData: { [productName: string]: number[] } = {};
    displayNames.forEach((displayName) => {
      seriesData[displayName] = new Array(timeAxis.length).fill(0);
    });

    let totalCalls = 0;

    // Aggregate data by day
    data.forEach((item) => {
      const itemDate = dayjs(item.hour_timestamp * 1000); // Convert to milliseconds
      const dateKey = itemDate.format('YYYY-MM-DD');
      const dayIndex = dateMap.get(dateKey);

      if (dayIndex !== undefined) {
        const productKey = getProductKey(item);
        const displayName =
          keyToDisplayName.get(productKey) || item.api_product_name;

        if (!seriesData[displayName]) {
          seriesData[displayName] = new Array(timeAxis.length).fill(0);
        }
        seriesData[displayName][dayIndex] += item.api_calls;
        totalCalls += item.api_calls;
      }
    });

    return {
      timeAxis,
      productNames: displayNames,
      seriesData,
      totalCalls,
    };
  } else {
    // Single day or short time range: display by hour
    const hourTimestamps = new Set<number>();
    data.forEach((item) => {
      hourTimestamps.add(item.hour_timestamp);
    });

    // Sort timestamps and generate time axis
    const sortedTimestamps = Array.from(hourTimestamps).sort((a, b) => a - b);
    const timeAxis = sortedTimestamps.map((timestamp) =>
      dayjs(timestamp * 1000).format('HH:mm')
    );

    // Create data mapping: {displayName: {timestamp: calls}}
    const dataMap: { [displayName: string]: { [timestamp: number]: number } } =
      {};
    displayNames.forEach((displayName) => {
      dataMap[displayName] = {};
    });

    // Fill data
    data.forEach((item) => {
      const productKey = getProductKey(item);
      const displayName =
        keyToDisplayName.get(productKey) || item.api_product_name;
      if (!dataMap[displayName]) {
        dataMap[displayName] = {};
      }
      if (!dataMap[displayName][item.hour_timestamp]) {
        dataMap[displayName][item.hour_timestamp] = 0;
      }
      dataMap[displayName][item.hour_timestamp] += item.api_calls;
    });

    // Convert to ECharts series data format
    const seriesData: { [displayName: string]: number[] } = {};
    let totalCalls = 0;

    displayNames.forEach((displayName) => {
      seriesData[displayName] = sortedTimestamps.map((timestamp) => {
        const calls = dataMap[displayName][timestamp] || 0;
        totalCalls += calls;
        return calls;
      });
    });

    return {
      timeAxis,
      productNames: displayNames,
      seriesData,
      totalCalls,
    };
  }
}
