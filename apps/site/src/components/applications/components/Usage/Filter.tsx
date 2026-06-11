'use client';

import { useMount } from 'ahooks';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { type DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

type Option = { value: string; label: string };

const rangePresets = [
  { label: '1 hour', from: () => dayjs().add(-1, 'h'), to: () => dayjs() },
  { label: '12 hours', from: () => dayjs().add(-12, 'h'), to: () => dayjs() },
  { label: '1 day', from: () => dayjs().add(-1, 'd'), to: () => dayjs() },
  { label: '7 days', from: () => dayjs().add(-7, 'd'), to: () => dayjs() },
  { label: '14 days', from: () => dayjs().add(-14, 'd'), to: () => dayjs() },
  { label: '30 days', from: () => dayjs().add(-30, 'd'), to: () => dayjs() },
];

const CRED_TYPE_PREFIX: Record<string, string> = {
  oauth: 'OAuth',
  'key-auth': 'Key',
  'basic-auth': 'Basic',
};

const formatDate = (d: Date) => dayjs(d).format('MMM D, YYYY');

const Filter = ({ id, onParamsChange }: FilterProps) => {
  const subscriptionList = useSubscriptionList({ application_id: id });
  const credentialList = useCredentialList({
    initParams: { application_id: [id] },
    savePage: false,
    fetchAll: true,
  });

  const defaultRange: DateRange = {
    from: dayjs().subtract(7, 'day').startOf('day').toDate(),
    to: dayjs().endOf('day').toDate(),
  };

  const [selectedProducts, setSelectedProducts] = useState<Option[]>([]);
  const [selectedCredentials, setSelectedCredentials] = useState<Option[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange>(defaultRange);
  const [isSelecting, setIsSelecting] = useState(false);

  const productAnchor = useComboboxAnchor();
  const credentialAnchor = useComboboxAnchor();

  const productOptions: Option[] =
    subscriptionList?.data?.map((item) => ({
      label: item.api_product_name,
      value: item.api_product_id,
    })) ?? [];

  const credentialOptions: Option[] =
    credentialList?.data?.map((item) => {
      const name = item.type === 'oauth' ? item.oauth.client_id : item.name;
      const prefix = CRED_TYPE_PREFIX[item.type] ?? item.type;
      return { label: `${prefix} · ${name}`, value: item.id };
    }) ?? [];

  useMount(() => {
    onParamsChange({
      start_at: dayjs(defaultRange.from).unix(),
      end_at: dayjs(defaultRange.to).unix(),
    });
  });

  const dateText =
    dateRange.from && dateRange.to
      ? `${formatDate(dateRange.from)} – ${formatDate(dateRange.to)}`
      : 'Select date range';

  return (
    <div className="flex gap-4 w-full justify-between">
      <div className="flex gap-4 w-1/2">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">API Product</label>
          <Combobox
            multiple
            autoHighlight
            items={productOptions}
            value={selectedProducts}
            isItemEqualToValue={(item, val) => item.value === val.value}
            onValueChange={(val) => {
              setSelectedProducts(val);
              onParamsChange({ api_product_id: val.map((v) => v.value) });
            }}
          >
            <ComboboxChips
              ref={productAnchor}
              className="w-full bg-background"
              data-testid="application-usage-filter-product"
            >
              <ComboboxValue>
                {(items) => (
                  <>
                    {items.map((item: Option) => (
                      <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder="All" />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={productAnchor}>
              <ComboboxEmpty>No products found</ComboboxEmpty>
              <ComboboxList>
                {(item: Option) => (
                  <ComboboxItem key={item.value} value={item}>
                    <span className="min-w-0 truncate">{item.label}</span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">
            API Credential
          </label>
          <Combobox
            multiple
            autoHighlight
            items={credentialOptions}
            value={selectedCredentials}
            isItemEqualToValue={(item, val) => item.value === val.value}
            onValueChange={(val) => {
              setSelectedCredentials(val);
              onParamsChange({ credential_id: val.map((v) => v.value) });
            }}
          >
            <ComboboxChips
              ref={credentialAnchor}
              className="w-full bg-background"
              data-testid="application-usage-filter-credential"
            >
              <ComboboxValue>
                {(items) => (
                  <>
                    {items.map((item: Option) => (
                      <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder="All" />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={credentialAnchor}>
              <ComboboxEmpty>No credentials found</ComboboxEmpty>
              <ComboboxList>
                {(item: Option) => (
                  <ComboboxItem key={item.value} value={item}>
                    <span className="min-w-0 truncate">{item.label}</span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </div>

      <div className="w-64 shrink-0">
        <label className="block text-sm font-medium mb-2">Date</label>
        <Popover
          open={calendarOpen}
          onOpenChange={(open) => {
            if (!open) setPendingRange(dateRange);
            setIsSelecting(false);
            setCalendarOpen(open);
          }}
        >
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-start gap-2 font-normal"
                data-testid="application-usage-filter-date"
              >
                <CalendarIcon />
                {dateText}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" side="bottom" align="end">
            <div className="flex">
              <div className="flex flex-col gap-1 border-r p-2">
                {rangePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      const from = preset.from();
                      const to = preset.to();
                      const range = { from: from.toDate(), to: to.toDate() };
                      setPendingRange(range);
                      setDateRange(range);
                      setIsSelecting(false);
                      onParamsChange({
                        start_at: from.unix(),
                        end_at: to.unix(),
                      });
                      setCalendarOpen(false);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                numberOfMonths={2}
                showOutsideDays={false}
                disabled={{ after: new Date() }}
                defaultMonth={dayjs(dateRange.to ?? new Date())
                  .subtract(1, 'month')
                  .toDate()}
                selected={isSelecting ? pendingRange : dateRange}
                onSelect={(range) => {
                  if (!range) return;
                  if (!isSelecting) {
                    // First click: extract the clicked date from whatever react-day-picker returns
                    let clicked: Date | undefined;
                    if (!range.to) {
                      clicked = range.from;
                    } else {
                      // Range was extended — determine which boundary changed
                      const fromChanged =
                        range.from?.getTime() !== dateRange.from?.getTime();
                      clicked = fromChanged ? range.from : range.to;
                    }
                    if (clicked) {
                      setIsSelecting(true);
                      setPendingRange({ from: clicked, to: undefined });
                    }
                  } else {
                    // Second click
                    setPendingRange(range);
                    if (range.from && range.to) {
                      setDateRange(range);
                      onParamsChange({
                        start_at: dayjs(range.from).startOf('day').unix(),
                        end_at: dayjs(range.to).endOf('day').unix(),
                      });
                      setCalendarOpen(false);
                      setIsSelecting(false);
                    }
                  }
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default Filter;
