'use client';

import { Building2, Mail, Plus, PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { CreateOrganizationDialog } from '@/components/auth/organization/create-organization-dialog';
import { UserInvitations } from '@/components/auth/organization/user-invitations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PATH_ROOT } from '@/constants/path-prefix';
import { authClient } from '@/lib/auth/client';

export default function LandingPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const redirectWhenHasOrganization = useCallback(() => {
    authClient.organization.list().then(({ data }) => {
      if (data?.length) router.replace(PATH_ROOT);
    });
  }, [router]);

  useEffect(() => {
    redirectWhenHasOrganization();
  }, [redirectWhenHasOrganization]);

  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) redirectWhenHasOrganization();
  };

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 max-w-4xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
          Organizations
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Add or join an organization to start collaborating with your team
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Add a new organization</h2>
                <p className="text-sm text-muted-foreground">Set up a new organization to start collaborating with your team</p>
              </div>
            </div>
            <div className="flex justify-center">
              <CreateOrganizationDialog open={open} onOpenChange={onOpenChange} />
              <Button size="lg" className="w-40" onClick={() => setOpen(true)}>
                <PlusIcon />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent">
              <Mail className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">View Pending Invitations</h2>
              <p className="text-sm text-muted-foreground">Please find an organizer to invite you, and then accept the invitations to join organizations</p>
            </div>
          </div>
          <UserInvitations />
        </div>
      </div>
    </div>
  );
}
