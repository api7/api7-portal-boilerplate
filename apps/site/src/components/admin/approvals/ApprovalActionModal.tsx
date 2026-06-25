'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { actOnApproval } from '@/lib/approvals/actions';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { type Approval } from '@/lib/portal-sdk/approval';

export type ApprovalAction = 'accept' | 'reject';

type Props = UseDisclosureReturn & {
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

const ApprovalActionModal = ({
  action,
  approval,
  open,
  onClose,
  onOk,
}: Props) => {
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
      await actOnApproval(approval.id, action);
      onOk?.();
      toast.success(config.success);
      onClose();
    } catch {
      toast.error('Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          {config.lead} this {requestKind} request
          {applicant ? (
            <>
              {' '}from{' '}
              <strong className="font-semibold text-foreground break-all">
                {applicant}
              </strong>
            </>
          ) : null}
          {approval.resource_name ? (
            <>
              {' '}for{' '}
              <strong className="font-semibold text-foreground">
                {approval.resource_name}
              </strong>
            </>
          ) : null}
          ?
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={config.danger ? 'destructive' : 'default'}
            disabled={submitting}
            onClick={handleAction}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ApprovalActionModal;
