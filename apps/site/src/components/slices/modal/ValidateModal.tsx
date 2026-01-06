import { ProFormText } from '@ant-design/pro-components';
import { useBoolean } from 'ahooks';
import { Typography } from 'antd';

import Form from '../form/Form';
import { type AlertProps } from '@/components/ui/alert';
import A7Modal, { type A7ModalProps } from '@/components/ui/modal';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';

type Props = A7ModalProps &
  UseDisclosureReturn & {
    confirmText: string;
    targetText: string;
    alertProps?: AlertProps;
  };

type FormType = {
  inputText: string;
};

const ValidateModal = (props: Props) => {
  const { confirmText, targetText, alertProps, ...rest } = props;
  const [okDisabled, okDisabledOp] = useBoolean(true);
  return (
    <A7Modal
      width={576}
      okText="Confirm"
      okButtonProps={{
        disabled: okDisabled,
        className:
          'rounded-md disabled:!text-white disabled:!bg-red-500 disabled:opacity-40',
        danger: true,
      }}
      {...rest}
      afterClose={() => {
        rest.afterClose?.();
        okDisabledOp.setTrue();
      }}
      alertProps={{
        type: 'error',
        ...alertProps,
      }}
    >
      <Typography.Paragraph className="!mb-2 text-base text-gray-800">
        Enter {targetText} <strong className="!font-bold">{confirmText}</strong>{' '}
        to confirm.
      </Typography.Paragraph>
      <Form<FormType>
        onValuesChange={(_, values) => {
          if (confirmText && values.inputText) {
            okDisabledOp.set(values.inputText.trim() !== confirmText.trim());
          }
        }}
        submitter={false}
        autoFocusFirstInput={false}
      >
        <ProFormText
          name="inputText"
          placeholder={confirmText}
          formItemProps={{ className: 'mb-0' }}
          fieldProps={{
            className: 'border-red-500 shadow-red-500 shadow-[0_0_0_1px]',
          }}
        />
      </Form>
    </A7Modal>
  );
};

export default ValidateModal;

