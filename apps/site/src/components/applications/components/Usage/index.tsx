'use client';

import type { GetApiCallsData } from '@api7/portal-sdk/unstable-types';
import { useDeepCompareEffect } from 'ahooks';
import { useState } from 'react';

import { getApplicationUsage } from '@/lib/dal/applications';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import type { UsageDataPoint } from '@/types/portal-sdk';
import Chart from './Chart';
import Filter from './Filter';

type ApplicationUsageProps = {
  id: string;
};

const ApplicationUsage = ({ id }: ApplicationUsageProps) => {
  const orgSlug = useOrganizationSlug();
  const [params, setParams] = useState({} as GetApiCallsData['query']);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsageDataPoint[]>([]);

  useDeepCompareEffect(() => {
    if (!params.start_at || !params.end_at || !orgSlug) {
      setData([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getApplicationUsage({
      data: {
        organizationSlug: orgSlug,
        application_id: [id],
        ...params,
      },
    })
      .then((res) => {
        if (cancelled) return;
        setData(res.list || []);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to fetch usage data:', error);
        setData([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params, id, orgSlug]);

  return (
    <div className="space-y-12 p-[16px] bg-muted rounded-[6px]">
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
