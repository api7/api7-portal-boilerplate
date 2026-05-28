import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type FilterParamProps = {
  subscription_status?: 'subscribed' | 'wait_for_approval' | 'unsubscribed';
};

type FilterSectionProps = {
  onParamsChange: (params: Partial<TableParams & FilterParamProps>) => void;
  defaultFilter?: FilterParamProps['subscription_status'];
};

const FILTER_CONTENT_DATA = {
  SUBS_STATUS: [
    {
      label: 'All',
      value: 'all',
    },
    {
      label: 'Subscribed',
      value: 'subscribed',
    },
    {
      label: 'Wait For Approval',
      value: 'wait_for_approval',
    },
  ] as {
    label: string;
    value: 'all' | FilterParamProps['subscription_status'];
  }[],
};

const FilterContent = (props: FilterSectionProps) => {
  const { onParamsChange, defaultFilter } = props;
  const [filter, setFilter] = useState<{
    subscription_status: FilterParamProps['subscription_status'] | 'all';
  }>({
    subscription_status: defaultFilter || 'all',
  });

  useEffect(
    () => setFilter({ subscription_status: defaultFilter || 'all' }),
    [defaultFilter]
  );

  return (
    <div className="w-full">
      {/* Status Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Status:</h3>
        <div className="flex flex-wrap gap-2">
          {FILTER_CONTENT_DATA.SUBS_STATUS.map(({ label, value }) => (
            <span
              key={value}
              className={cn(
                'px-3 py-1 text-sm rounded-md cursor-pointer transition-colors',
                filter.subscription_status === value
                  ? 'bg-blue-100 text-blue-500'
                  : 'text-gray-700'
              )}
              onClick={() => {
                setFilter({ subscription_status: value });
                onParamsChange({
                  subscription_status: value === 'all' ? undefined : value,
                });
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Filter = (props: FilterSectionProps) => {
  const { onParamsChange, defaultFilter } = props;

  return (
    <aside className="card-container w-full shrink-0 lg:w-[425px]!">
      <Card className="border-0 shadow-none bg-white">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex justify-between items-center text-lg font-semibold text-gray-800">
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4 border-b pb-4">
          <FilterContent
            onParamsChange={onParamsChange}
            defaultFilter={defaultFilter}
          />
        </CardContent>
      </Card>
    </aside>
  );
};

export default Filter;
