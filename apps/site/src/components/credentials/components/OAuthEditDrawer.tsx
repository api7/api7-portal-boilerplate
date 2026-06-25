'use client';

import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Drawer from '@/components/base/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
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
      await portalClient.application.credential.update(
        applicationId,
        oldData!.id,
        {
          desc: value.desc !== undefined ? value.desc : oldData?.desc,
          type: 'oauth',
          oauth: {
            redirect_uris: transformRedirectURIsToAPI(value.redirect_uris),
          },
        },
      );
      onOk?.();
      toast.success(`${title} Successfully`);
      props.onClose();
    },
  });

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
        <FormItemOAuth form={form} isEdit />
      </form>
    </Drawer>
  );
};

export default OAuthEditDrawer;
