'use client';

import { useForm, useSelector } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Drawer from '@/components/base/drawer';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import { updateCredential } from '@/lib/dal/credentials';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
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
  const orgSlug = useOrganizationSlug();

  const updateMutation = useMutation({
    mutationFn: updateCredential,
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : `Failed to ${title.toLowerCase()}`,
      ),
  });

  const form = useForm({
    defaultValues: {
      name: oldData?.name ?? '',
      desc: oldData?.desc ?? '',
      labels: transformAPILabelToForm(oldData?.labels) as FormLabel,
    },
    onSubmit: async ({ value }) => {
      if (!orgSlug) return;
      await updateMutation.mutateAsync({
        data: {
          organizationSlug: orgSlug,
          applicationId,
          credentialId: oldData!.id,
          type: oldData!.type,
          name: value.name,
          desc: value.desc || undefined,
          labels: transformFormLabelToAPI(value.labels),
        } as {
          organizationSlug: string;
          applicationId: string;
          credentialId: string;
        } & UpdateApplicationCredentialReq,
      });
      onOk?.();
      toast.success(`${title} Successfully`);
      props.onClose();
    },
  });
  const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

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
          labelProps={{ resourceType: 'developer_credential' }}
        />
      </form>
    </Drawer>
  );
};

export default CredentialEditDrawer;
