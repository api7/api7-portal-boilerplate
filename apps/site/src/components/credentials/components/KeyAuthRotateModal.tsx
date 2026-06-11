'use client';

import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import type {
  KeyAuthCredential,
  KeyAuthPluginValue,
} from '@/types/portal-sdk';

import { useApplicationId } from '../hook';

type KeyAuthRotateModalProps = UseDisclosureReturn & {
  oldData?: KeyAuthCredential;
  // Surfaces the regenerated key once; it is never returned again on read paths.
  setAlertData?: (key: string) => void;
};

const KeyAuthRotateModal = (props: KeyAuthRotateModalProps) => {
  const { oldData, onOk, setAlertData, ...rest } = props;
  const applicationId = useApplicationId();

  if (!oldData) return null;

  const submitRotate = () =>
    portalClient.application.credential
      .regenerate(applicationId, oldData.id, {
        type: 'key-auth',
        'key-auth': {},
      })
      .then((res) => {
        const key = (
          (res as KeyAuthCredential)['key-auth'] as
            | KeyAuthPluginValue
            | undefined
        )?.key;
        if (!key) {
          throw new Error('Regenerated key was not returned');
        }
        setAlertData?.(key);
      })
      .then(onOk)
      .then(() =>
        toast.success('Rotate Key Authentication Credential Successfully'),
      )
      .then(props.onClose);

  return (
    <ValidateModal
      title="Rotate Key Authentication Credential"
      okText="Confirm"
      confirmText={oldData?.name}
      targetText={'the credential name'}
      alertProps={{
        description:
          'After rotation, a new key will be generated, and the old key will be immediately invalidated.',
      }}
      onOk={submitRotate}
      {...rest}
    />
  );
};

export default KeyAuthRotateModal;
