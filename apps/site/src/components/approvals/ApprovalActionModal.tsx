'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import Modal from '@/components/base/modal';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { approvalApi, type Approval } from '@/lib/portal-sdk/approval';

export type ApprovalAction = 'accept' | 'reject';

type ApprovalActionModalProps = UseDisclosureReturn & {
  action: ApprovalAction;
  approval?: Approval;
};

const ACTION_CONFIG: Record<
  ApprovalAction,
  { title: string; lead: string; danger: boolean; success: string }
> = {
  accept: {
    title: 'Approve Request',
    lead: 'Approve',
    danger: false,
    success: 'Request approved',
  },
  reject: {
    title: 'Reject Request',
    lead: 'Reject',
    danger: true,
    success: 'Request rejected',
  },
};

const ApprovalActionModal = (props: ApprovalActionModalProps) => {
  const { action, approval, onOk, onClose, ...rest } = props;
  const [submitting, setSubmitting] = useState(false);

  if (!approval) return null;

  const config = ACTION_CONFIG[action];
  const requestKind =
    approval.event === 'developer_registration'
      ? 'developer registration'
      : 'subscription';
  const applicant = approval.applicant_org_name || approval.applicant_name;

  const handleAction = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await approvalApi[action](approval.id);
      onOk?.();
      toast.success(config.success);
      onClose();
    } catch {
      // Don't surface raw backend errors to users.
      toast.error('Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={config.title}
      okType={config.danger ? 'danger' : 'default'}
      okText="Confirm"
      onOk={handleAction}
      okButtonProps={{ disabled: submitting }}
      {...rest}
    >
      <p className="text-base text-gray-800">
        {config.lead} this {requestKind} request
        {applicant ? (
          <>
            {' '}
            from <strong className="font-bold break-all">{applicant}</strong>
          </>
        ) : null}
        {approval.resource_name ? (
          <>
            {' '}
            for <strong className="font-bold">{approval.resource_name}</strong>
          </>
        ) : null}
        ?
      </p>
    </Modal>
  );
};

export default ApprovalActionModal;
