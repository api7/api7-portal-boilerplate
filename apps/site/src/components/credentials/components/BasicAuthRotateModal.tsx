'use client';

import { ProForm } from '@ant-design/pro-components';
import { toast } from 'sonner';

import { FormItemBasicAuth } from './BasicAuthAddDrawer';
import { useApplicationId } from '../hook';
import Form from '@/components/slices/form/Form';
import { portalClient } from '@/lib/portal-sdk/client';
import A7Modal from '@/components/ui/modal';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import type {
  BasicAuthCredential,
  BasicAuthPluginValue,
  CredentialForm,
} from '@/types/portal-sdk';

type BasicAuthRotateModalProps = UseDisclosureReturn & {
  oldData?: BasicAuthCredential;
};

const BasicAuthRotateModal = (props: BasicAuthRotateModalProps) => {
  const { oldData, onOk, ...rest } = props;
  const [form] = ProForm.useForm();
  const applicationId = useApplicationId();

  if (!oldData) return null;

  const submitRotate = (form: CredentialForm) => {
    const { username, password } = form?.['basic-auth'] as BasicAuthPluginValue;

    return portalClient.application.credential
      .regenerate(applicationId, oldData.id, {
        type: 'basic-auth',
        'basic-auth': {
          username,
          password,
        },
      })
      .then(onOk)
      .then(() =>
        toast.success('Rotate Basic Authentication Credential Successfully')
      )
      .then(props.onClose);
  };

  return (
    <A7Modal
      title={'Rotate Basic Authentication Credential'}
      onOk={form.submit}
      destroyOnHidden
      alertProps={{
        type: 'error',
        message:
          'After rotation, the username and password will be immediately invalidated.',
      }}
      okButtonProps={{
        className:
          'rounded-md disabled:!text-white disabled:!bg-red-500 disabled:opacity-40',
        danger: true,
      }}
      okText="Confirm"
      {...rest}
    >
      <Form<CredentialForm>
        form={form}
        onFinish={submitRotate}
        submitter={false}
        preserve={false}
      >
        <FormItemBasicAuth form={form} />
      </Form>
    </A7Modal>
  );
};

export default BasicAuthRotateModal;
