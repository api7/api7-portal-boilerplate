import { type FC, type ReactNode } from 'react';

import { Button, Dropdown } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';

import IconImage, { BareIconImage } from '@/components/ui/icon-image';
import { cn } from '@/lib/utils';

type MenuItem = {
  label: ReactNode;
  key: string;
  onClick?: () => void;
  hidden?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
  className?: string;
};

type MoreMenuProps<T = Record<string, unknown>> = {
  items: MenuItem[];
  menuButtonProps?: T;
  type?: 'more' | 'actions';
  CustomMenuButton?: FC<T>;
  ['data-testid']?: string;
  className?: string;
};

export const MoreMenu = <T extends Record<string, unknown>>(
  props: MoreMenuProps<T>
) => {
  const {
    items,
    menuButtonProps,
    type = 'more',
    CustomMenuButton,
    className,
    ...rest
  } = props;

  // Convert items to antd menu format
  const menuItems: ItemType[] = items
    .filter((item) => !item.hidden)
    .map((item) => ({
      key: item.key,
      label: (
        <div className={cn('gap-4 flex items-center', item.className)}>
          {item.label}
        </div>
      ),
      onClick: item.onClick,
      disabled: item.disabled,
      className: cn('!px-3 !py-4 !leading-5'),
    }));

  // Default button props for actions type
  const defaultButtonProps = {
    className: cn(
      'h-8 text-sm border border-gray-200 bg-white px-3 shadow-none',
      'flex items-center gap-1'
    ),
  };

  return (
    <Dropdown
      trigger={['click']}
      destroyPopupOnHide
      menu={{
        items: menuItems,
        className: '!w-40 !p-0',
      }}
      {...rest}
    >
      {CustomMenuButton ? (
        <CustomMenuButton
          {...(type === 'actions' ? defaultButtonProps : {})}
          {...(menuButtonProps as T)}
        />
      ) : type === 'more' ? (
        <Button
          type="text"
          icon={<IconImage type="more" />}
          data-testid="more"
          rootClassName={className}
          {...menuButtonProps}
        />
      ) : (
        <Button
          {...defaultButtonProps}
          data-testid="actions"
          rootClassName={cn(defaultButtonProps.className, className)}
          {...menuButtonProps}
        >
          Actions
          <BareIconImage src="/icons/chevron-down.svg" size={12} />
        </Button>
      )}
    </Dropdown>
  );
};

