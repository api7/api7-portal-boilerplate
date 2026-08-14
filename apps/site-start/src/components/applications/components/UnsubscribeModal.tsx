'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import { unsubscribe } from '@/lib/dal/subscriptions';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';

type UnsubscribeModalProps = UseDisclosureReturn & {
  id?: string;
  name?: string;
};

const UnsubscribeModal = (props: UnsubscribeModalProps) => {
  const { id, name, onOk, onClose, ...rest } = props;
  const orgSlug = useOrganizationSlug();
  const unsubscribeMutation = useMutation({
    mutationFn: unsubscribe,
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to unsubscribe API product',
      );
    },
  });

  if (!id || !name) return null;

  const handleUnsubscribe = () => {
    if (!orgSlug) return Promise.resolve();
    return unsubscribeMutation
      .mutateAsync({
        data: { organizationSlug: orgSlug, subscriptionId: id },
      })
      .then(() => {
        onOk?.();
        toast.success('Unsubscribe API Product Successfully');
        onClose();
      })
      .catch(() => {});
  };

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
