import { StyleProvider } from '@ant-design/cssinjs';
import { Modal, type ModalProps } from 'antd';

import Alert, { type AlertProps } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const btnProps = {
  size: 'large',
  className: 'rounded-md',
} as const;

export type A7ModalProps = ModalProps & {
  titleProps?: React.HTMLAttributes<HTMLDivElement>;
  showDivider?: boolean;
  alertProps?: AlertProps;
};

const A7Modal = (props: A7ModalProps) => {
  const {
    children,
    title,
    titleProps,
    okButtonProps,
    cancelButtonProps,
    classNames,
    showDivider = true,
    okType,
    alertProps,
    ...rest
  } = props;

  const dangerStyle =
    'rounded-md disabled:!text-white disabled:!bg-red-500 disabled:opacity-40';

  return (
    // StyleProvider allow for partial overrides without affecting other styles.
    <StyleProvider layer>
      <Modal
        closeIcon={false}
        centered
        destroyOnHidden
        classNames={{
          body: cn(
            showDivider && 'border-y-[1px] border-solid border-gray-200',
            'py-4!'
          ),
          header: 'p-4 mb-0',
          footer: 'p-4 mt-0 flex justify-end gap-3',
          ...classNames,
        }}
        okButtonProps={{
          ...btnProps,
          ...okButtonProps,

          ...(okType === 'danger' && { className: dangerStyle, danger: true }),
        }}
        okText={okType === 'danger' ? 'Confirm' : 'Save'}
        cancelText="Cancel"
        cancelButtonProps={{ ...btnProps, ...cancelButtonProps }}
        title={
          <div className="text-lg" {...titleProps}>
            {title}
          </div>
        }
        {...rest}
      >
        {alertProps && <Alert {...alertProps} />}
        {children}
      </Modal>
    </StyleProvider>
  );
};

export default A7Modal;

