'use client';

import { toast } from 'sonner';

import { useApplicationId } from '../hook';
import ValidateModal from '@/components/slices/modal/ValidateModal';
import { portalClient } from '@/lib/portal-sdk/client';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import type { KeyAuthCredential } from '@/types/portal-sdk';

type KeyAuthRotateModalProps = UseDisclosureReturn & {
  oldData?: KeyAuthCredential;
};

const KeyAuthRotateModal = (props: KeyAuthRotateModalProps) => {
  const { oldData, onOk, ...rest } = props;
  const applicationId = useApplicationId();

  if (!oldData) return null;

  const submitRotate = () =>
    portalClient.application.credential
      .regenerate(applicationId, oldData.id, {
        type: 'key-auth',
        'key-auth': {},
      })
      .then(onOk)
      .then(() =>
        toast.success('Rotate Key Authentication Credential Successfully')
      )
      .then(props.onClose);

  return (
    <ValidateModal
      title="Rotate Key Authentication Credential"
      confirmText={oldData?.name}
      targetText={'the credential name'}
      alertProps={{
        message:
          'After rotation, a new key will be generated, and the old key will be immediately invalidated.',
      }}
      onOk={submitRotate}
      {...rest}
    />
  );
};

export default KeyAuthRotateModal;
