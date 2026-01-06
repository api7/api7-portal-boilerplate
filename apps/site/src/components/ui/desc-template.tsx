'use client';

import { type DescriptionsProps, Descriptions } from 'antd';
import type { DescriptionsItemType } from 'antd/es/descriptions';

type DescTemplateProps = Omit<DescriptionsProps, 'items'> & {
  items?: (DescriptionsItemType & {
    hidden?: boolean;
  })[];
};

export const DescTemplate = (props: DescTemplateProps) => {
  const { items, ...rest } = props;
  return (
    <Descriptions
      bordered
      labelStyle={{
        backgroundColor: '#F6F7F9',
        width: '160px',
        padding: '12px 16px',
      }}
      contentStyle={{
        padding: '8px',
      }}
      items={items?.filter((o) => !o.hidden)}
      {...rest}
    />
  );
};
