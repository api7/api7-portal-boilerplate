'use client';

import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import type { OAuthCredential } from '@/types/portal-sdk';

import { useApplicationId } from '../hook';

type OAuthDeleteProps = UseDisclosureReturn & {
  oldData?: OAuthCredential;
};

const OAuthDeleteModal = (props: OAuthDeleteProps) => {
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
