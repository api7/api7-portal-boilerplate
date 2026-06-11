'use client';

import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import type { PluginCredential } from '@/types/portal-sdk';

import { useApplicationId } from '../hook';

type CredentialDeleteProps = UseDisclosureReturn & {
  oldData?: PluginCredential;
};

const CredentialDeleteModal = (props: CredentialDeleteProps) => {
  const { oldData, onOk, ...rest } = props;
  const applicationId = useApplicationId();
  if (!oldData) return null;

  const submitDelete = () =>
    portalClient.application.credential
      .delete(applicationId, oldData.id)
      .then(onOk)
      .then(() => toast.success('Delete Credential Successfully'))
      .then(props.onClose);

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
