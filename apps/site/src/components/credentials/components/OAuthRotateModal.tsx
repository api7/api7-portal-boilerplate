'use client';

import { toast } from 'sonner';

import { useApplicationId } from '../hook';
import ValidateModal from '@/components/slices/modal/ValidateModal';
import { portalClient } from '@/lib/portal-sdk/client';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import type {
  ApplicationCredential,
  OAuthCredential,
  OAuthCredentialBasics,
} from '@/types/portal-sdk';

type OAuthRotateModalProps = UseDisclosureReturn & {
  oldData?: OAuthCredential;
  setAlertData: (data: OAuthCredentialBasics['oauth']) => void;
};

const OAuthRotateModal = (props: OAuthRotateModalProps) => {
  const { oldData, onOk, ...rest } = props;
  const applicationId = useApplicationId();

  if (!oldData) return null;

  const submitRotate = () =>
    portalClient.application.credential
      .regenerate(applicationId, oldData.id, {
        type: 'oauth',
      })
      .then((res: ApplicationCredential) => {
        if (res.type !== 'oauth') {
          throw new Error('Expected OAuth credential from regenerate response');
        }

        props.setAlertData(res.oauth);
      })
      .then(onOk)
      .then(() => toast.success('Regenerate OAuth Client Secret Successfully'))
      .then(props.onClose);

  return (
    <ValidateModal
      title="Regenerate OAuth Client Secret"
      confirmText={oldData?.oauth?.client_id ?? ''}
      targetText={'the Client ID'}
      alertProps={{
        message:
          'After regeneration, a new Client Secret will be generated, and the old Client Secret will be immediately invalidated.',
      }}
      onOk={submitRotate}
      {...rest}
    />
  );
};

export default OAuthRotateModal;
