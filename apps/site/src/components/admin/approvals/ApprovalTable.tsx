'use client';

import { useCreation } from 'ahooks';
import { CheckIcon, EllipsisVerticalIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { StatusBadge } from '@/components/base/status-badge';
import { DataTable } from '@/components/base/data-table';
import TimeFormat from '@/components/slices/time-format';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useDisclosure from '@/lib/hooks/useDisclosure';
import { type Approval, resolveOperatorName } from '@/lib/portal-sdk/approval';
import useApprovalList from '@/lib/query/useApprovalList';
import type { ColumnDef } from '@tanstack/react-table';

import ApprovalActionModal, {
  type ApprovalAction,
} from './ApprovalActionModal';

const EVENT_TEXT: Record<string, string> = {
  api_product_subscription: 'API Product Subscription',
  developer_registration: 'Developer Registration',
};

const RESULT_STATUS: Record<string, { color: string; text: string }> = {
  accepted: { color: 'green', text: 'Accepted' },
  rejected: { color: 'red', text: 'Rejected' },
  cancelled: { color: 'gray', text: 'Cancelled' },
};

const renderStatus = (approval: Approval) => {
  if (approval.status === 'pending') {
    return (
      <StatusBadge color="orange">
        Pending
      </StatusBadge>
    );
  }
  const config = approval.result ? RESULT_STATUS[approval.result] : undefined;
  return (
    <StatusBadge color={config?.color ?? 'gray'}>
      {config?.text ?? 'Finished'}
    </StatusBadge>
  );
};

const ApprovalTable: React.FC = () => {
  const req = useApprovalList({ savePage: true });
  const actionDisclosure = useDisclosure();
  const [curApproval, setCurApproval] = useState<Approval | undefined>();
  const [action, setAction] = useState<ApprovalAction>('accept');

  const openAction = (next: ApprovalAction, data: Approval) => {
    setCurApproval(data);
    setAction(next);
    actionDisclosure.setOpen();
  };

  const columns = useCreation<ColumnDef<Approval>[]>(
    () => [
      {
        header: 'Type',
        accessorKey: 'event',
        cell: ({ getValue }) =>
          EVENT_TEXT[getValue() as string] ?? (getValue() as string),
      },
      {
        header: 'Resource',
        accessorKey: 'resource_name',
        cell: ({ getValue }) => (getValue() as string) || '-',
      },
      {
        header: 'Applicant',
        id: 'applicant',
        cell: ({ row }) =>
          row.original.applicant_org_name ||
          row.original.applicant_name ||
          '-',
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => renderStatus(row.original),
      },
      {
        header: 'Submitted',
        accessorKey: 'applied_at',
        enableSorting: true,
        cell: ({ row }) => (
          <TimeFormat
            time={row.original.applied_at ?? row.original.created_at}
            fromNow
          />
        ),
      },
      {
        header: 'Operator',
        id: 'operator',
        cell: ({ row }) => resolveOperatorName(row.original) || '-',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const disabled = row.original.status !== 'pending';
          return (
            <ButtonGroup aria-label="Approval actions">
              <Button
                variant="ghost"
                disabled={disabled}
                onClick={() => openAction('accept', row.original)}
              >
                <CheckIcon />
                Accept
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="More options"
                      disabled={disabled}
                    >
                      <EllipsisVerticalIcon />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={disabled}
                      onClick={() => openAction('reject', row.original)}
                    >
                      <XIcon />
                      Reject
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          );
        },
      },
    ],
    [req],
  );

  return (
    <>
      <DataTable
        data-testid="approval-table"
        columns={columns}
        {...req}
        nameSearch
        text={{ searchPlaceholder: 'Search type, resource, applicant' }}
      />
      <ApprovalActionModal
        {...actionDisclosure}
        action={action}
        approval={curApproval}
      />
    </>
  );
};

export default ApprovalTable;
