import {
  Alert,
  Button,
  Drawer,
  type AlertProps,
  type ButtonProps,
  type DrawerProps,
} from 'antd';
import { motion } from 'framer-motion';
import { debounce } from 'lodash-es';

import IconImage from './icon-image';

export type A7DrawerProps = {
  children?: React.ReactNode;
  title: string;
  okText?: string;
  cancelText?: string;
  loading?: boolean;
  width?: string;
  okDebounceWait?: number;
  okProps?: ButtonProps;
  onOk?: () => void;
  showAlert?: boolean;
  alertProps?: AlertProps;
  customAlert?: React.ReactNode;
} & DrawerProps;

const MotionAlert = motion(Alert);

const A7Drawer: React.FC<A7DrawerProps> = (props) => {
  const {
    children,
    title,
    loading,
    cancelText = 'Cancel',
    okDebounceWait = 400,
    okText = 'Add',
    onOk,
    showAlert = false,
    customAlert,
    ...drawerProps
  } = props;
  const {
    message: _alertMessage,
    title: alertPropTitle,
    ...safeAlertProps
  } = props.alertProps || {};
  const alertTitle = alertPropTitle ?? props.alertProps?.message;
  return (
    <Drawer
      closeIcon={null}
      size='large'
      zIndex={1400}
      title={
        <div className="flex justify-between text-lg font-semibold">
          <div>{title}</div>
          <Button
            className="center border-none shadow-none"
            icon={<IconImage type="close" width={24} height={24} />}
            onClick={(e) => props?.onClose?.(e)}
          />
        </div>
      }
      footer={
        <div className="flex justify-end h-12">
          <div className="center">
            <Button className="h-10" onClick={(e) => props?.onClose?.(e)}>
              {cancelText}
            </Button>
            {onOk && (
              <Button
                type="primary"
                className="ml-4 h-10"
                onClick={debounce(onOk, okDebounceWait)}
                loading={loading}
                {...props?.okProps}
              >
                {okText}
              </Button>
            )}
          </div>
        </div>
      }
      {...drawerProps}
      classNames={{ body: 'px-6!', ...drawerProps.classNames }}
    >
      {showAlert &&
        (customAlert || (
          <MotionAlert
            className="bg-red-200 flex items-start mb-4"
            showIcon
            animate={{ scale: [0, 1], y: 0 }}
            transition={{ duration: 0.3 }}
            {...safeAlertProps}
            title={alertTitle}
          />
        ))}

      {children}
    </Drawer>
  );
};

export default A7Drawer;
