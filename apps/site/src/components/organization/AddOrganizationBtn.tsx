'use client';

import { useEffect, useState } from 'react';
import { Button } from 'antd';

import { useRedirectWhenHasOrganization } from './hooks';
import { CreateOrganizationModal } from './CreateOrganizationModal';

export const AddOrganizationBtn = () => {
  const [open, setOpen] = useState(false);
  const redirectWhenHasOrganization = useRedirectWhenHasOrganization();

  const onOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) redirectWhenHasOrganization();
  };

  // Redirect if user already has an organization on mount
  useEffect(() => {
    redirectWhenHasOrganization();
  }, [redirectWhenHasOrganization]);

  return (
    <div className="flex justify-center">
      <CreateOrganizationModal open={open} onOpenChange={onOpenChange} />
      <Button
        type="primary"
        size="large"
        className="w-40"
        onClick={() => setOpen(true)}
      >
        Add
      </Button>
    </div>
  );
};
