import { Alert as AntdAlert, type AlertProps as AntdAlertProps } from 'antd';

import { cn } from '@/lib/utils';

export type AlertProps = AntdAlertProps;

const Alert = (props: AlertProps) => {
  const { type, title, message, ...rest } = props;
  return (
    <AntdAlert
      showIcon
      banner
      // error use info icon like in console
      type={type === 'error' ? 'info' : type}
      title={title ?? message}
      {...rest}
      className={cn(
        'flex !items-start !my-4 rounded [&>.ant-alert-content]:text-gray-700',
        type === 'error' && '[&>.ant-alert-icon]:!text-red-600 [&>.ant-alert-icon]:!text-xl !bg-red-50',
        rest.className
      )}
    />
  );
};

export default Alert;

