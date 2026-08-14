'use client';

import type { DeveloperApplication } from '@api7/portal-sdk/unstable-types';
import { useForm, useSelector } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Drawer from '@/components/base/drawer';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import { updateApplication } from '@/lib/dal/applications';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import type { FormLabel } from '@/types/utils';
import {
  transformAPILabelToForm,
  transformFormLabelToAPI,
} from '@/utils/form-producer/labels';

const ApplicationEditDrawer = (
  props: UseDisclosureReturn & { data?: DeveloperApplication },
) => {
  const { data, open, onClose, onOk, ...rest } = props;
  const orgSlug = useOrganizationSlug();

  const updateMutation = useMutation({
    mutationFn: updateApplication,
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : 'Failed to edit application',
      ),
  });

  const form = useForm({
    defaultValues: {
      name: data?.name ?? '',
      desc: data?.desc ?? '',
      labels: transformAPILabelToForm(data?.labels) as FormLabel,
    },
    onSubmit: async ({ value }) => {
      if (!data?.id || !orgSlug) return;
      await updateMutation.mutateAsync({
        data: {
          organizationSlug: orgSlug,
          applicationId: data.id,
          name: value.name,
          desc: value.desc || undefined,
          labels: transformFormLabelToAPI(value.labels),
        },
      });
      onOk?.();
      toast.success('Edit Application Successfully');
      onClose();
    },
  });
  const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

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
      loading={isSubmitting || !orgSlug}
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
