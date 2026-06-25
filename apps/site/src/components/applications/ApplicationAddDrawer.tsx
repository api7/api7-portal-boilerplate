'use client';

import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Drawer from '@/components/base/drawer';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import type { FormLabel } from '@/types/utils';
import { transformFormLabelToAPI } from '@/utils/form-producer/labels';

const ApplicationAddDrawer = (props: UseDisclosureReturn) => {
  const { open, onClose, onOk, ...rest } = props;

  const form = useForm({
    defaultValues: {
      name: '',
      desc: '',
      labels: [] as FormLabel,
    },
    onSubmit: async ({ value }) => {
      await portalClient.application.create({
        name: value.name,
        desc: value.desc || undefined,
        labels: transformFormLabelToAPI(value.labels),
      });
      onOk?.();
      toast.success('Add Application Successfully');
      onClose();
    },
  });

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  return (
    <Drawer
      title="Add Application"
      open={open}
      onClose={onClose}
      onOk={() => form.handleSubmit()}
      loading={form.state.isSubmitting}
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
          labelProps={{ resourceType: 'developer_application' }}
        />
      </form>
    </Drawer>
  );
};

export default ApplicationAddDrawer;
