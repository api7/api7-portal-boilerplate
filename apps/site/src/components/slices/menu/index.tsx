'use client';

import { Button, Dropdown, type DropDownProps } from 'antd';
import type { ItemType, MenuItemType } from 'antd/es/menu/interface';
import { omit } from 'lodash-es';

import IconImage from '@/components/ui-legacy/icon-image';
import { cn } from '@/helper/utils/tailwind';

type WrapperType = { labelProps?: React.HTMLAttributes<HTMLDivElement> };
function buildMenuItem<T extends MenuItemType>(
  item: ItemType<T> & WrapperType
): ItemType<T> {
  if (item?.type === 'item' || (item && !item?.type)) {
    const { label, className, labelProps } = item;
    const baseItem = omit(item, 'labelProps') as ItemType<T>;
    return {
      ...baseItem,
      ...(label && {
        label: (
          <div
            {...labelProps}
            className={cn('gap-4 flex items-center', labelProps?.className)}
          >
            {label}
          </div>
        ),
      }),
      className: cn('!px-3 !py-4 !leading-5', className),
    } as ItemType<T>;
  }
  return item;
}

export type MenuProps = DropDownProps & {
  items?: (ItemType & WrapperType)[];
};

const Menu = (props: MenuProps) => {
  const { menu, items, children, ...rest } = props;
  return (
    <Dropdown
      trigger={['click']}
      destroyOnHidden
      menu={{
        className: '!w-40 !p-0 !shadow-md',
        ...omit(menu, 'items'),
        ...(items && { items: items?.map(buildMenuItem) }),
      }}
      {...rest}
    >
      {children || <Button type="text" icon={<IconImage type="more" />} />}
    </Dropdown>
  );
};

export default Menu;
