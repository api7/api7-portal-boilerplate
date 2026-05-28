import React from 'react';

import { Tabs, type TabsProps } from 'antd';

export type A7Props = TabsProps;

const A7Tabs: React.FC<A7Props> = (props) => (
  <Tabs
    indicator={{ size: (origin) => origin + 20, align: 'center' }}
    tabPlacement="top"
    destroyOnHidden
    {...props}
  />
);

export default A7Tabs;
