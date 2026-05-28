import { useMemo } from 'react';

import { ProForm, ProFormList } from '@ant-design/pro-components';
import { useCreation } from 'ahooks';
import { AutoComplete, Button, Form, type AutoCompleteProps } from 'antd';
import type { FormListProps } from 'antd/es/form';

import IconImage from '../icon-image';
import useLabelList from '@/lib/query/useLabelList';
import { cn } from '@/helper/utils/tailwind';

import type { FormLabel } from '@/types/utils';
import { LabelParams } from '@/types/portal-sdk';

export type FormItemLabelProps = {
  name: string;
  fitWidth?: boolean;
  required?: boolean;
  keyProps?: Partial<AutoCompleteProps>;
  valueProps?: Partial<AutoCompleteProps>;
} & FormListProps &
  LabelParams;

const FormItemLabel = (props: FormItemLabelProps) => {
  const {
    resourceType,
    name,
    fitWidth,
    keyProps,
    valueProps,
    ...formListProps
  } = props;

  const { data } = useLabelList({ resourceType });

  const watchName = Form.useWatch(name) as FormLabel;
  const allSelectedKeys = useCreation(
    () => watchName?.map((item: { key: string }) => item.key) || [],
    [watchName]
  );

  // compute value options
  const valueOptions = useMemo(() => {
    const options: Record<number, { value: string }[]> = {};
    if (watchName) {
      allSelectedKeys.forEach((item: string, index: number) => {
        const values = (data?.[item] || []).map((item: string) => ({
          value: item,
        }));
        options[index] = values;
      });
    }
    return options;
  }, [allSelectedKeys, data, watchName]);

  const keyOptions = useMemo(
    () =>
      Object.keys(data || {})
        .map((key) => ({ value: key }))
        .filter((item) => !allSelectedKeys.includes(item.value)) as {
        value: string;
      }[],
    [data, allSelectedKeys]
  );
  const fitWStyle = useCreation(
    () => ({ width: fitWidth ? '100%' : '140px' }),
    [fitWidth]
  );

  return (
    <ProFormList
      label="Labels"
      name={name}
      copyIconProps={false}
      deleteIconProps={false}
      creatorRecord={{ key: undefined, value: undefined }}
      creatorButtonProps={{
        creatorButtonText: 'Add',
        className: '!w-fit !border-solid',
      }}
      {...formListProps}
    >
      {(meta, index, field) => (
        <div className={cn('flex gap-2', fitWidth && '100%')}>
          <ProForm.Item
            key="key"
            name="key"
            className="!mb-2"
            rules={[
              { required: true, message: 'Please enter key' },
              {
                validator: async (_rule: unknown, value?: string) => {
                  if (!value) return;
                  const curKeys = allSelectedKeys.filter(
                    (d: string, i: number) => i !== index
                  );
                  if (curKeys.filter(Boolean).includes(value)) {
                    return Promise.reject('Duplicate keys');
                  }
                },
              },
            ]}
          >
            <AutoComplete
              placeholder="key"
              options={keyOptions}
              allowClear
              {...keyProps}
              style={{ ...fitWStyle, ...keyProps?.style }}
            />
          </ProForm.Item>

          {/* the line-height is the <input /> component height */}
          <p className="leading-8">:</p>
          <ProForm.Item
            key="value"
            name="value"
            className="!mb-2"
            rules={[
              { required: true, message: 'Please enter value' },
              {
                pattern: /^.+$/,
                message: 'Please provide at least one character',
              },
            ]}
          >
            <AutoComplete
              placeholder="value"
              allowClear
              options={valueOptions?.[index] || []}
              {...valueProps}
              style={{ ...fitWStyle, ...valueProps?.style }}
            />
          </ProForm.Item>
          <Button
            variant="text"
            icon={
              <IconImage
                width={24}
                height={24}
                className="size-12"
                type="delete"
              />
            }
            onClick={() => field.remove(meta.name)}
            data-testid={`delete-label-${index}`}
            className="border-none shadow-none ml-0.5"
          />
        </div>
      )}
    </ProFormList>
  );
};

export default FormItemLabel;
