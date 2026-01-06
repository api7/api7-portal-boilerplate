'use client';
import { UserInvitationsCard } from '@daveyplate/better-auth-ui';
import { useRedirectWhenHasOrganization } from './hooks';

export const UserInvitations = () => {
  const redirectWhenHasOrganization = useRedirectWhenHasOrganization();
  return (
    <UserInvitationsCard
      title=""
      description=""
      classNames={{
        base: 'py-0 border-none shadow-none',
        header: 'hidden',
        content: 'p-0',
      }}
      onClick={redirectWhenHasOrganization}
    />
  );
};
