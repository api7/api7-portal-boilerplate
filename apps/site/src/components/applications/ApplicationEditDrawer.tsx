'use client';

import { useEffect } from 'react';

import { ProForm } from '@ant-design/pro-components';
import { toast } from 'sonner';

import Form from '@/components/slices/form/Form';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import A7Drawer from '@/components/ui-legacy/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { pipeProduce } from '@/helper/utils/form-producer/common';
import {
  produceToAPILabels,
  produceToFormLabels,
} from '@/helper/utils/form-producer/labels';
import { portalClient } from '@/lib/portal-sdk/client';
import type {
  CreateDeveloperApplicationReq,
  DeveloperApplication,
} from '@api7/portal-sdk/unstable-types';

const ApplicationEditDrawer = (
  props: UseDisclosureReturn & { data?: DeveloperApplication }
) => {
  const { data, open, onClose, onOk, ...rest } = props;
  const [form] = ProForm.useForm();

  useEffect(() => form.resetFields(), [form, open]);

  const submitEdit = (formData: CreateDeveloperApplicationReq) => {
    return portalClient.application
      .update(data!.id, pipeProduce(produceToAPILabels)(formData))
      .then(() => {
        onOk?.();
        toast.success('Edit Application Successfully');
      })
      .then(onClose);
  };

  return (
    <A7Drawer
      title="Edit Application Basics"
      open={open}
      onClose={onClose}
      onOk={form.submit}
      okText="Save"
      destroyOnHidden
      {...rest}
    >
      <Form
        form={form}
        onFinish={submitEdit}
        submitter={false}
        initialValues={produceToFormLabels(data || {})}
      >
        <FormPartBasics
          labelProps={{ resourceType: 'developer_application' }}
          isChunk={false}
        />
      </Form>
    </A7Drawer>
  );
};

export default ApplicationEditDrawer;

