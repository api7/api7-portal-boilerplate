'use client';

import { useForm, useSelector } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Drawer from '@/components/base/drawer';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import { createApplication } from '@/lib/dal/applications';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import type { FormLabel } from '@/types/utils';
import { transformFormLabelToAPI } from '@/utils/form-producer/labels';

const ApplicationAddDrawer = (props: UseDisclosureReturn) => {
  const { open, onClose, onOk, ...rest } = props;
  const orgSlug = useOrganizationSlug();

  const createMutation = useMutation({
    mutationFn: createApplication,
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : 'Failed to add application',
      ),
  });

  const form = useForm({
    defaultValues: {
      name: '',
      desc: '',
      labels: [] as FormLabel,
    },
    onSubmit: async ({ value }) => {
      if (!orgSlug) return;
      await createMutation.mutateAsync({
        data: {
          organizationSlug: orgSlug,
          name: value.name,
          desc: value.desc || undefined,
          labels: transformFormLabelToAPI(value.labels),
        },
      });
      onOk?.();
      toast.success('Add Application Successfully');
      onClose();
    },
  });
  const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  return (
    <Drawer
      title="Add Application"
      open={open}
      onClose={onClose}
      onOk={() => form.handleSubmit()}
      loading={isSubmitting || !orgSlug}
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
