'use client';

import { ProForm } from '@ant-design/pro-components';
import { toast } from 'sonner';

import Form from '@/components/slices/form/Form';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import A7Drawer from '@/components/ui/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { pipeProduce } from '@/helper/utils/form-producer/common';
import { produceToAPILabels } from '@/helper/utils/form-producer/labels';
import { portalClient } from '@/lib/portal-sdk/client';
import type {
  CreateDeveloperApplicationReq,
  DeveloperApplication,
} from '@api7/portal-sdk/unstable-types';

const ApplicationAddDrawer = (props: UseDisclosureReturn) => {
  const { open, onClose, onOk, ...rest } = props;
  const [form] = ProForm.useForm();
  const close = () => {
    onClose();
    form.resetFields();
  };

  const submitAdd = (formData: CreateDeveloperApplicationReq) =>
    portalClient.application
      .create(pipeProduce(produceToAPILabels)(formData))
      .then(() => {
        onOk?.();
        toast.success('Add Application Successfully');
      })
      .then(close);

  return (
    <A7Drawer
      title="Add Application"
      open={open}
      onClose={close}
      onOk={form.submit}
      {...rest}
    >
      <Form<DeveloperApplication>
        form={form}
        onFinish={submitAdd}
        submitter={false}
        preserve={false}
        clearOnDestroy
      >
        <FormPartBasics
          labelProps={{ resourceType: 'developer_application' }}
          isChunk={false}
        />
      </Form>
    </A7Drawer>
  );
};

export default ApplicationAddDrawer;
