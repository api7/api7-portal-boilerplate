'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import { deleteCredential } from '@/lib/dal/credentials';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import type { PluginCredential } from '@/types/portal-sdk';
import { useApplicationId } from '../hook';

type CredentialDeleteProps = UseDisclosureReturn & {
  oldData?: PluginCredential;
};

const CredentialDeleteModal = (props: CredentialDeleteProps) => {
  const { oldData, onOk, ...rest } = props;
  const applicationId = useApplicationId();
  const orgSlug = useOrganizationSlug();
  const deleteMutation = useMutation({
    mutationFn: deleteCredential,
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete credential',
      );
    },
  });
  if (!oldData) return null;

  const submitDelete = () => {
    if (!orgSlug) return Promise.resolve();
    return deleteMutation
      .mutateAsync({
        data: {
          organizationSlug: orgSlug,
          applicationId,
          credentialId: oldData.id,
        },
      })
      .then(onOk)
      .then(() => toast.success('Delete Credential Successfully'))
      .then(props.onClose)
      .catch(() => {});
  };

  return (
    <ValidateModal
      title="Delete Credential"
      confirmText={oldData.name}
      targetText={'the credential name'}
      alertProps={{
        variant: 'destructive',
        description:
          'Deletion is irreversible. It will take effect immediately.',
      }}
      onOk={submitDelete}
      {...rest}
    />
  );
};

export default CredentialDeleteModal;
