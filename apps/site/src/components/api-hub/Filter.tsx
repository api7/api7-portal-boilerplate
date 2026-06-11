import { useState } from 'react';

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
  const [prevDefaultFilter, setPrevDefaultFilter] = useState(defaultFilter);
  if (prevDefaultFilter !== defaultFilter) {
    setPrevDefaultFilter(defaultFilter);
    setFilter({ subscription_status: defaultFilter || 'all' });
  }

  return (
    <div className="w-full">
      {/* Status Section */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Status:</h3>
        <div className="flex flex-wrap gap-2">
          {FILTER_CONTENT_DATA.SUBS_STATUS.map(({ label, value }) => (
            <span
              key={value}
              className={cn(
                'px-3 py-1 text-sm rounded-md cursor-pointer transition-colors',
                filter.subscription_status === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground'
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
      <Card className="border-0 shadow-none bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex justify-between items-center text-lg font-semibold text-foreground">
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
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
