'use client';

import { ProForm, type ProFormItemProps } from '@ant-design/pro-components';
import { toast } from 'sonner';

import { useApplicationId } from '../hook';
import Form from '@/components/slices/form/Form';
import { portalClient } from '@/lib/portal-sdk/client';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import Alert from '@/components/ui-legacy/alert';
import A7Drawer from '@/components/ui-legacy/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import type {
  CreateApplicationCredentialReq,
  CredentialForm,
} from '@/types/portal-sdk';
import { pipeProduce } from '@/lib/utils/form-producer/common';
import { produceToAPILabels } from '@/helper/utils/form-producer/labels';

export const FormItemKey = ({ children, ...rest }: ProFormItemProps) => {
  return (
    <ProForm.Item label="Key" required {...rest}>
      {children || (
        <Alert
          type="info"
          title="A random key will be automatically generated. You cannot specify a custom key value."
        />
      )}
    </ProForm.Item>
  );
};

const KeyAuthAddDrawer = (props: UseDisclosureReturn) => {
  const { open, onClose, onOk, ...rest } = props;
  const [form] = ProForm.useForm();
  const applicationId = useApplicationId();
  const submitAdd = (formData: CredentialForm) =>
    portalClient.application.credential
      .create(applicationId, {
        ...pipeProduce(produceToAPILabels)(formData),
        type: 'key-auth',
        'key-auth': {},
      } as CreateApplicationCredentialReq)
      .then(() => {
        onOk?.();
        toast.success('Add Key Authentication Credential Successfully');
      })
      .then(onClose);

  return (
    <A7Drawer
      title={'Add Key Authentication Credential'}
      open={open}
      onClose={onClose}
      onOk={form.submit}
      destroyOnHidden
      {...rest}
    >
      <Form<CredentialForm>
        form={form}
        onFinish={submitAdd}
        submitter={false}
        preserve={false}
      >
        <FormPartBasics
          title={'Credential Basics'}
          labelProps={{ resourceType: 'developer_credential' }}
        />
        <FormItemKey />
      </Form>
    </A7Drawer>
  );
};

export default KeyAuthAddDrawer;
