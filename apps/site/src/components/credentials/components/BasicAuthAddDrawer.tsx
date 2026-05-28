'use client';

import {
  pickControlPropsWithId,
  ProForm,
  ProFormItemRender,
  ProFormText,
} from '@ant-design/pro-components';
import { Button, Input, Space, type FormInstance } from 'antd';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';

import { useApplicationId } from '../hook';
import Form from '@/components/slices/form/Form';
import { portalClient } from '@/lib/portal-sdk/client';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import A7Drawer from '@/components/ui-legacy/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { pipeProduce } from '@/helper/utils/form-producer/common';
import { produceToAPILabels } from '@/helper/utils/form-producer/labels';
import type {
  BasicAuthPluginValue,
  CreateApplicationCredentialReq,
  CredentialForm,
} from '@/types/portal-sdk';

export const FormItemBasicAuth = ({ form }: { form: FormInstance }) => {
  return (
    <>
      <ProFormText
        label="Username"
        name={['basic-auth', 'username']}
        placeholder="johndoe"
        tooltip="The username is a unique identifier used in conjunction with a password to verify a user's identity during API calls."
        rules={[{ required: true }]}
      />
      <ProFormItemRender
        label="Password"
        name={['basic-auth', 'password']}
        rules={[{ required: true }]}
        help="Enter a custom password or click 'Generate' to create a random one."
      >
        {(props) => (
          <Space.Compact style={{ width: '100%' }}>
            <Input.Password {...pickControlPropsWithId(props)} placeholder="" />
            <Button
              onClick={() => {
                form.setFieldValue(
                  ['basic-auth', 'password'],
                  nanoid()
                );
              }}
              style={{
                width: '100px',
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
              }}
            >
              Generate
            </Button>
          </Space.Compact>
        )}
      </ProFormItemRender>
    </>
  );
};

const BasicAuthAddDrawer = (props: UseDisclosureReturn) => {
  const { open, onClose, onOk, ...rest } = props;
  const [form] = ProForm.useForm();
  const applicationId = useApplicationId();
  const submitAdd = (form: CredentialForm) => {
    const { username, password } = form?.['basic-auth'] as BasicAuthPluginValue;

    return portalClient.application.credential
      .create(applicationId, {
        ...(pipeProduce(produceToAPILabels)(form) as CredentialForm),
        type: 'basic-auth',
        'basic-auth': {
          username,
          password,
        },
      } as CreateApplicationCredentialReq)
      .then(() => {
        onOk?.();
        toast.success('Add Basic Authentication Credential Successfully');
      })
      .then(onClose);
  };

  return (
    <A7Drawer
      title={'Add Basic Authentication Credential'}
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
        <FormItemBasicAuth form={form} />
      </Form>
    </A7Drawer>
  );
};

export default BasicAuthAddDrawer;
