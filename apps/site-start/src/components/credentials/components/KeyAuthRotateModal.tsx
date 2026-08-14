'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import { regenerateCredential } from '@/lib/dal/credentials';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import type { KeyAuthCredential, KeyAuthPluginValue } from '@/types/portal-sdk';
import { useApplicationId } from '../hook';

type KeyAuthRotateModalProps = UseDisclosureReturn & {
  oldData?: KeyAuthCredential;
  // Surfaces the regenerated key once; it is never returned again on read paths.
  setAlertData?: (key: string) => void;
};

const KeyAuthRotateModal = (props: KeyAuthRotateModalProps) => {
  const { oldData, onOk, setAlertData, ...rest } = props;
  const applicationId = useApplicationId();
  const orgSlug = useOrganizationSlug();
  const regenerateMutation = useMutation({ mutationFn: regenerateCredential });

  if (!oldData) return null;

  const submitRotate = () => {
    if (!orgSlug) return Promise.resolve();
    return regenerateMutation
      .mutateAsync({
        data: {
          organizationSlug: orgSlug,
          applicationId,
          credentialId: oldData.id,
          type: 'key-auth',
          'key-auth': {},
        },
      })
      .then((res) => {
        const key = (
          (res as KeyAuthCredential)['key-auth'] as
            | KeyAuthPluginValue
            | undefined
        )?.key;
        if (!key) {
          throw new Error(
            'The credential was rotated, but no new key was returned. Please rotate again to obtain a key.',
          );
        }
        setAlertData?.(key);
      })
      .then(onOk)
      .then(() =>
        toast.success('Rotate Key Authentication Credential Successfully'),
      )
      .then(props.onClose)
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Failed to rotate key authentication credential',
        );
      });
  };

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
