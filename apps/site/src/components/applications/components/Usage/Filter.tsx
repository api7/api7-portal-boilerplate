'use client';

import { useMount } from 'ahooks';
import { DatePicker, Select, type TimeRangePickerProps } from 'antd';
import dayjs from 'dayjs';

import useCredentialList from '@/lib/query/useCredentialList';
import useSubscriptionList from '@/lib/query/useSubscriptionList';

type FilterProps = {
  id: string;
  onParamsChange: (params: {
    api_product_id?: string[];
    credential_id?: string[];
    start_at?: number;
    end_at?: number;
  }) => void;
};

const Filter = ({ id, onParamsChange }: FilterProps) => {
  const subscriptionList = useSubscriptionList({
    application_id: id,
  });
  const credentialList = useCredentialList({
    initParams: {
      application_id: [id],
    },
    savePage: false,
    fetchAll: true,
  });

  // default date range is today
  const defaultDateRange: [dayjs.Dayjs, dayjs.Dayjs] = [
    dayjs().startOf('day'),
    dayjs().endOf('day'),
  ];

  const rangePresets: TimeRangePickerProps['presets'] = [
    { label: '1 hour', value: [dayjs().add(-1, 'h'), dayjs()] },
    { label: '12 hours', value: [dayjs().add(-12, 'h'), dayjs()] },
    { label: '1 day', value: [dayjs().add(-1, 'd'), dayjs()] },
    { label: '7 days', value: [dayjs().add(-7, 'd'), dayjs()] },
    { label: '14 days', value: [dayjs().add(-14, 'd'), dayjs()] },
    { label: '30 days', value: [dayjs().add(-30, 'd'), dayjs()] },
  ];

  // set default date range when component mount
  useMount(() => {
    onParamsChange({
      start_at: defaultDateRange[0].unix(),
      end_at: defaultDateRange[1].unix(),
    });
  });

  return (
    <div className="flex gap-4 w-full justify-between">
      <div className="flex gap-4 w-1/2">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">API Product</label>
          <Select
            mode="multiple"
            showSearch
            className="w-full"
            filterOption={false}
            maxTagCount="responsive"
            placeholder="All"
            data-testid="application-usage-filter-product"
            options={subscriptionList?.data?.map((item) => ({
              label: item.api_product_name,
              value: item.api_product_id,
            }))}
            menuItemSelectedIcon={null}
            onChange={(value) => {
              onParamsChange({ api_product_id: value });
            }}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">
            API Credential
          </label>
          <Select
            mode="multiple"
            showSearch
            filterOption={false}
            maxTagCount="responsive"
            className="w-full"
            placeholder="All"
            data-testid="application-usage-filter-credential"
            options={credentialList?.data?.map((item) => ({
              label: item.type === 'oauth' ? item.oauth.client_id : item.name,
              value: item.id,
            }))}
            menuItemSelectedIcon={null}
            onChange={(value) => {
              onParamsChange({ credential_id: value });
            }}
          />
        </div>
      </div>
      <div className="w-1/3">
        <label className="block text-sm font-medium mb-2">Date</label>
        <DatePicker.RangePicker
          presets={rangePresets}
          showTime
          className="w-full"
          allowClear={false}
          defaultValue={defaultDateRange}
          placeholder={['Start date', 'End date']}
          data-testid="application-usage-filter-date"
          onChange={(value) => {
            onParamsChange({
              start_at: value?.[0]?.unix(),
              end_at: value?.[1]?.unix(),
            });
          }}
        />
      </div>
    </div>
  );
};

export default Filter;
