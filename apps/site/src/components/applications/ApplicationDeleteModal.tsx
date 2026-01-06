'use client';

import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';

type ApplicationDeleteModalProps = UseDisclosureReturn & {
  id?: string;
  name?: string;
};

const ApplicationDeleteModal = (props: ApplicationDeleteModalProps) => {
  const { id, name, onOk, onClose, ...rest } = props;

  if (!id || !name) return null;

  const handleDelete = () =>
    portalClient.application.delete(id).then(() => {
      onOk?.();
      toast.success('Delete Application Successfully');
      onClose();
    });

  return (
    <ValidateModal
      title="Delete Application"
      confirmText={name}
      targetText="the application name"
      alertProps={{
        message: (
          <p className="text-sm leading-[24px]">
            Deleting this application will:
            <ul className="list-disc list-inside">
              <li>Cancel all API subscriptions associated with it</li>
              <li>Delete all API credentials</li>
            </ul>
          </p>
        ),
      }}
      onOk={handleDelete}
      onClose={onClose}
      {...rest}
    />
  );
};

export default ApplicationDeleteModal;

