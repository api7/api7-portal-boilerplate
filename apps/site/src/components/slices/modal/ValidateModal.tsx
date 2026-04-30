import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { ProFormText } from '@ant-design/pro-components';
import { useClipboard } from '@chakra-ui/react';
import { useBoolean } from 'ahooks';
import { Tooltip, Typography } from 'antd';

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
  const clipboard = useClipboard(confirmText);
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
        Enter {targetText}{' '}
        <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5">
          <strong className="min-w-0 break-all !font-bold">
            {confirmText}
          </strong>
          <Tooltip
            title={clipboard.hasCopied ? 'Copied' : 'Copy to clipboard'}
            trigger={['hover', 'focus']}
          >
            <button
              type="button"
              onClick={() => clipboard.onCopy()}
              className="inline-flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 text-gray-400 hover:text-gray-600"
              aria-label={
                clipboard.hasCopied ? 'Copied' : 'Copy to clipboard'
              }
            >
              {clipboard.hasCopied ? (
                <CheckOutlined className="text-green-500" />
              ) : (
                <CopyOutlined />
              )}
            </button>
          </Tooltip>
        </span>{' '}
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

