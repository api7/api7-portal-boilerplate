'use client';

import { CreateOrganizationDialog } from '@daveyplate/better-auth-ui';
import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { useRedirectWhenHasOrganization } from './hooks';

export const AddOrganizationBtn = () => {
  const [open, setOpen] = useState(false);
  const redirectWhenHasOrganization = useRedirectWhenHasOrganization();
  const onOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) redirectWhenHasOrganization();
  };

  // call this when the component is mounted
  // to avoid the user into organization landing page when they have an organization.
  useEffect(() => {
    redirectWhenHasOrganization();
  }, [redirectWhenHasOrganization]);

  return (
    <div className="flex justify-center">
      <CreateOrganizationDialog open={open} onOpenChange={onOpenChange} />
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
