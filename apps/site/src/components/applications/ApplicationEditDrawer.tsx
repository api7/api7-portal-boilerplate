'use client';

import type { DeveloperApplication } from '@api7/portal-sdk/unstable-types';
import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Drawer from '@/components/base/drawer';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import type { FormLabel } from '@/types/utils';
import {
  transformAPILabelToForm,
  transformFormLabelToAPI,
} from '@/utils/form-producer/labels';

const ApplicationEditDrawer = (
  props: UseDisclosureReturn & { data?: DeveloperApplication },
) => {
  const { data, open, onClose, onOk, ...rest } = props;

  const form = useForm({
    defaultValues: {
      name: data?.name ?? '',
      desc: data?.desc ?? '',
      labels: transformAPILabelToForm(data?.labels) as FormLabel,
    },
    onSubmit: async ({ value }) => {
      await portalClient.application.update(data!.id, {
        name: value.name,
        desc: value.desc || undefined,
        labels: transformFormLabelToAPI(value.labels),
      });
      onOk?.();
      toast.success('Edit Application Successfully');
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: data?.name ?? '',
        desc: data?.desc ?? '',
        labels: transformAPILabelToForm(data?.labels) as FormLabel,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Drawer
      title="Edit Application Basics"
      open={open}
      onClose={onClose}
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
          labelProps={{ resourceType: 'developer_application' }}
        />
      </form>
    </Drawer>
  );
};

export default ApplicationEditDrawer;
