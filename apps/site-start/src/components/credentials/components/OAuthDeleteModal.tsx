'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import { deleteCredential } from '@/lib/dal/credentials';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import type { OAuthCredential } from '@/types/portal-sdk';
import { useApplicationId } from '../hook';

type OAuthDeleteProps = UseDisclosureReturn & {
  oldData?: OAuthCredential;
};

const OAuthDeleteModal = (props: OAuthDeleteProps) => {
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
      title="Delete OAuth Client"
      confirmText={oldData.oauth?.client_id ?? ''}
      targetText={'the OAuth client ID'}
      alertProps={{ description: 'Deletion is irreversible.' }}
      onOk={submitDelete}
      {...rest}
    />
  );
};

export default OAuthDeleteModal;
