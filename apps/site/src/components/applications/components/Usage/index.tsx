'use client';

import { useState } from 'react';

import { useDeepCompareEffect } from 'ahooks';

import Chart from './Chart';
import Filter from './Filter';
import { portalClient } from '@/lib/portal-sdk/client';
import type { UsageDataPoint } from '@/types/portal-sdk';
import { GetApiCallsData } from '@api7/portal-sdk/unstable-types';

type ApplicationUsageProps = {
  id: string;
};

const ApplicationUsage = ({ id }: ApplicationUsageProps) => {
  const [params, setParams] = useState({} as GetApiCallsData['query']);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsageDataPoint[]>([]);

  useDeepCompareEffect(() => {
    if (!params.start_at || !params.end_at) {
      return;
    }

    setLoading(true);
    portalClient.application
      .apiCall({
        application_id: [id],
        ...params,
      })
      .then((res) => {
        setData(res.list || []);
      })
      .catch((error) => {
        console.error('Failed to fetch usage data:', error);
        setData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params, id]);

  return (
    <div className="space-y-12 p-[16px] bg-[#FAFBFD] rounded-[6px]">
      <Filter
        id={id}
        onParamsChange={(params) => {
          setParams((prev) => ({ ...prev, ...params }));
        }}
      />
      <div className="w-full">
        <Chart
          loading={loading}
          startTime={params.start_at}
          endTime={params.end_at}
          data={data}
        />
      </div>
    </div>
  );
};

export default ApplicationUsage;
