'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import { regenerateCredential } from '@/lib/dal/credentials';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import type {
  ApplicationCredential,
  OAuthCredential,
  OAuthCredentialBasics,
} from '@/types/portal-sdk';
import { useApplicationId } from '../hook';

type OAuthRotateModalProps = UseDisclosureReturn & {
  oldData?: OAuthCredential;
  setAlertData: (data: OAuthCredentialBasics['oauth']) => void;
};

const OAuthRotateModal = (props: OAuthRotateModalProps) => {
  const { oldData, onOk, ...rest } = props;
  const applicationId = useApplicationId();
  const orgSlug = useOrganizationSlug();
  const regenerateMutation = useMutation({
    mutationFn: regenerateCredential,
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to regenerate OAuth client secret',
      );
    },
  });

  if (!oldData) return null;

  const submitRotate = () => {
    if (!orgSlug) return Promise.resolve();
    return regenerateMutation
      .mutateAsync({
        data: {
          organizationSlug: orgSlug,
          applicationId,
          credentialId: oldData.id,
          type: 'oauth',
        },
      })
      .then((res: ApplicationCredential) => {
        if (res.type !== 'oauth') {
          throw new Error('Expected OAuth credential from regenerate response');
        }

        props.setAlertData(res.oauth);
      })
      .then(onOk)
      .then(() => toast.success('Regenerate OAuth Client Secret Successfully'))
      .then(props.onClose)
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Failed to regenerate OAuth client secret',
        );
      });
  };

  return (
    <ValidateModal
      title="Regenerate OAuth Client Secret"
      confirmText={oldData?.oauth?.client_id ?? ''}
      targetText={'the Client ID'}
      alertProps={{
        description:
          'After regeneration, a new Client Secret will be generated, and the old Client Secret will be immediately invalidated.',
      }}
      onOk={submitRotate}
      {...rest}
    />
  );
};

export default OAuthRotateModal;
