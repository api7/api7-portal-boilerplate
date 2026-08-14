'use client';

import { useForm, useSelector } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Modal from '@/components/base/modal';
import { regenerateCredential } from '@/lib/dal/credentials';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import type {
  BasicAuthCredential,
  BasicAuthPluginValue,
} from '@/types/portal-sdk';
import { useApplicationId } from '../hook';
import { FormItemBasicAuth } from './BasicAuthAddDrawer';

type BasicAuthRotateModalProps = UseDisclosureReturn & {
  oldData?: BasicAuthCredential;
  // Surfaces the new username/password once; never returned again on read paths.
  setAlertData?: (data: BasicAuthPluginValue) => void;
};

const BasicAuthRotateModal = (props: BasicAuthRotateModalProps) => {
  const { oldData, onOk, open, setAlertData, ...rest } = props;
  const applicationId = useApplicationId();
  const orgSlug = useOrganizationSlug();

  const regenerateMutation = useMutation({
    mutationFn: regenerateCredential,
    onError: (err) =>
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to rotate basic authentication credential',
      ),
  });

  const form = useForm({
    defaultValues: {
      basicAuth: { username: '', password: '' },
    },
    onSubmit: async ({ value }) => {
      if (!oldData || !orgSlug) return;
      const res = (await regenerateMutation.mutateAsync({
        data: {
          organizationSlug: orgSlug,
          applicationId,
          credentialId: oldData.id,
          type: 'basic-auth',
          'basic-auth': {
            username: value.basicAuth.username,
            password: value.basicAuth.password,
          },
        },
      })) as BasicAuthCredential;
      setAlertData?.(res['basic-auth'] as BasicAuthPluginValue);
      onOk?.();
      toast.success('Rotate Basic Authentication Credential Successfully');
      props.onClose();
    },
  });
  const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  return (
    <Modal
      title="Rotate Basic Authentication Credential"
      okType="danger"
      onOk={oldData ? () => form.handleSubmit() : undefined}
      alertProps={{
        variant: 'destructive',
        description:
          'After rotation, the username and password will be immediately invalidated.',
      }}
      okButtonProps={{
        disabled: isSubmitting || !orgSlug,
        className:
          'rounded-md disabled:!text-white disabled:!bg-red-500 disabled:opacity-40',
      }}
      open={open}
      {...rest}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        {oldData ? <FormItemBasicAuth form={form} /> : null}
      </form>
    </Modal>
  );
};

export default BasicAuthRotateModal;
