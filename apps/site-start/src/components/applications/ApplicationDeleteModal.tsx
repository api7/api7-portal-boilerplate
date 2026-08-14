'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import ValidateModal from '@/components/slices/modal/ValidateModal';
import { deleteApplication } from '@/lib/dal/applications';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';

type ApplicationDeleteModalProps = UseDisclosureReturn & {
  id?: string;
  name?: string;
};

const ApplicationDeleteModal = (props: ApplicationDeleteModalProps) => {
  const { id, name, onOk, onClose, ...rest } = props;
  const orgSlug = useOrganizationSlug();

  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete application',
      );
    },
  });

  if (!id || !name) return null;

  const handleDelete = () => {
    if (!orgSlug) return Promise.resolve();
    return deleteMutation
      .mutateAsync({
        data: { organizationSlug: orgSlug, applicationId: id },
      })
      .then(() => {
        onOk?.();
        toast.success('Delete Application Successfully');
        onClose();
      })
      .catch(() => {});
  };

  return (
    <ValidateModal
      title="Delete Application"
      confirmText={name}
      targetText="the application name"
      alertProps={{
        title: 'Deleting this application will:',
        description: (
          <ul className="list-disc list-inside">
            <li>Cancel all API subscriptions associated with it</li>
            <li>Delete all API credentials</li>
          </ul>
        ),
      }}
      onOk={handleDelete}
      onClose={onClose}
      {...rest}
    />
  );
};

export default ApplicationDeleteModal;
