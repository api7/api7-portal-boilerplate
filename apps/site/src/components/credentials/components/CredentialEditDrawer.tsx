'use client';

import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Drawer from '@/components/base/drawer';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import type {
  PluginCredential,
  UpdateApplicationCredentialReq,
} from '@/types/portal-sdk';
import type { FormLabel } from '@/types/utils';
import {
  transformAPILabelToForm,
  transformFormLabelToAPI,
} from '@/utils/form-producer/labels';
import { useApplicationId } from '../hook';

export type CredentialEditDrawerProps = UseDisclosureReturn & {
  oldData?: PluginCredential;
  title: string;
};

const CredentialEditDrawer = (props: CredentialEditDrawerProps) => {
  const { open, onOk, oldData, title, ...rest } = props;
  const applicationId = useApplicationId();

  const form = useForm({
    defaultValues: {
      name: oldData?.name ?? '',
      desc: oldData?.desc ?? '',
      labels: transformAPILabelToForm(oldData?.labels) as FormLabel,
    },
    onSubmit: async ({ value }) => {
      await portalClient.application.credential.update(
        applicationId,
        oldData!.id,
        {
          type: oldData!.type,
          name: value.name,
          desc: value.desc || undefined,
          labels: transformFormLabelToAPI(value.labels),
        } as UpdateApplicationCredentialReq,
      );
      onOk?.();
      toast.success(`${title} Successfully`);
      props.onClose();
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: oldData?.name ?? '',
        desc: oldData?.desc ?? '',
        labels: transformAPILabelToForm(oldData?.labels) as FormLabel,
      });
    }
  }, [open, oldData, form]);

  return (
    <Drawer
      open={open}
      title={title}
      onOk={() => form.handleSubmit()}
      loading={form.state.isSubmitting}
      okText="Save"
      {...rest}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FormPartBasics
          form={form}
          labelProps={{ resourceType: 'developer_credential' }}
        />
      </form>
    </Drawer>
  );
};

export default CredentialEditDrawer;
