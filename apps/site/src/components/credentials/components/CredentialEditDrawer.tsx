'use client';

import { useEffect } from 'react';

import { ProForm } from '@ant-design/pro-components';
import { toast } from 'sonner';

import { useApplicationId } from '../hook';
import Form from '@/components/slices/form/Form';
import { portalClient } from '@/lib/portal-sdk/client';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import A7Drawer from '@/components/ui-legacy/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { pipeProduce } from '@/helper/utils/form-producer/common';
import {
  produceToAPILabels,
  produceToFormLabels,
} from '@/helper/utils/form-producer/labels';
import type {
  Basics,
  PluginCredential,
  UpdateApplicationCredentialReq,
} from '@/types/portal-sdk';
import type { ToFormLabel } from '@/types/utils';

export type CredentialEditDrawerProps = UseDisclosureReturn & {
  oldData?: PluginCredential;
  title: string;
};

const CredentialEditDrawer = (props: CredentialEditDrawerProps) => {
  const { open, onOk, oldData, title, ...rest } = props;
  const [form] = ProForm.useForm();
  const applicationId = useApplicationId();

  useEffect(() => form.resetFields(), [form, oldData]);

  const submitEdit = (form: ToFormLabel<Basics>) =>
    // TODO: Wait for or help the upstream project fix the transform issue.
    // FormItemLabel use `transform`, but transform cannot be triggered when the corresponding field is not modified.
    // we still need produceXXX before submit
    // ref: https://github.com/ant-design/pro-components/issues/8700
    portalClient.application.credential
      .update(applicationId, oldData!.id, {
        type: oldData!.type,
        ...pipeProduce(produceToAPILabels)(form),
      } as UpdateApplicationCredentialReq)
      .then(() => {
        onOk?.();
        toast.success(`${title} Successfully`);
      })
      .then(props?.onClose);

  return (
    <A7Drawer
      open={open}
      title={title}
      onOk={form.submit}
      okText="Save"
      {...rest}
    >
      <Form<ToFormLabel<Basics>>
        form={form}
        onFinish={submitEdit}
        submitter={false}
        initialValues={produceToFormLabels(oldData || {})}
      >
        <FormPartBasics
          isChunk={false}
          labelProps={{ resourceType: 'developer_credential' }}
        />
      </Form>
    </A7Drawer>
  );
};

export default CredentialEditDrawer;
