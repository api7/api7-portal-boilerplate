'use client';

import { useForm, useSelector } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Drawer from '@/components/base/drawer';
import { updateCredential } from '@/lib/dal/credentials';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import type { OAuthCredential } from '@/types/portal-sdk';
import {
  transformAPIRedirectURIsToForm,
  transformRedirectURIsToAPI,
} from '@/utils/form-producer/redirect_uris';
import { useApplicationId } from '../hook';
import { FormItemOAuth } from './OAuthAddDrawer';

export type OAuthEditDrawerProps = UseDisclosureReturn & {
  oldData?: OAuthCredential;
  title: string;
};

const OAuthEditDrawer = (props: OAuthEditDrawerProps) => {
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

  const defaultValues = {
    dcr_provider_id: oldData?.oauth?.dcr_provider_id ?? '',
    redirect_uris: transformAPIRedirectURIsToForm(
      oldData?.oauth?.redirect_uris,
    ),
    desc: oldData?.desc ?? '',
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (!orgSlug) return;
      await updateMutation.mutateAsync({
        data: {
          organizationSlug: orgSlug,
          applicationId,
          credentialId: oldData!.id,
          desc: value.desc !== undefined ? value.desc : oldData?.desc,
          type: 'oauth',
          oauth: {
            redirect_uris: transformRedirectURIsToAPI(value.redirect_uris),
          },
        },
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
        dcr_provider_id: oldData?.oauth?.dcr_provider_id ?? '',
        redirect_uris: transformAPIRedirectURIsToForm(
          oldData?.oauth?.redirect_uris,
        ),
        desc: oldData?.desc ?? '',
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
        <FormItemOAuth form={form} isEdit />
      </form>
    </Drawer>
  );
};

export default OAuthEditDrawer;
