'use client';

import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';

type UnsubscribeModalProps = UseDisclosureReturn & {
  id?: string;
  name?: string;
};

const UnsubscribeModal = (props: UnsubscribeModalProps) => {
  const { id, name, onOk, onClose, ...rest } = props;

  if (!id || !name) return null;

  const handleUnsubscribe = () =>
    portalClient.subscription.unsubscribe(id).then(() => {
      onOk?.();
      toast.success('Unsubscribe API Product Successfully');
      onClose();
    });

  return (
    <ValidateModal
      title="Unsubscribe API Product"
      confirmText={name}
      targetText="the API product name"
      alertProps={{
        description:
          'After unsubscribing, you will no longer be able to access this API product using your application credentials.',
      }}
      onOk={handleUnsubscribe}
      onClose={onClose}
      {...rest}
    />
  );
};

export default UnsubscribeModal;
