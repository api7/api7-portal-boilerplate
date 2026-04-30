'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { queryClient } from '@/lib/req';
import { OrganizationSwitcher, UserButton } from '@daveyplate/better-auth-ui';
import {
  NON_ORG_PREFIX_ROUTE_SEGMENTS,
  useOrganizationSlug,
} from '@/lib/hooks/useOrganizationSlug';
import { CreateOrganizationModal } from '@/components/organization/CreateOrganizationModal';

const UserMenu = () => {
  const router = useRouter();
  const pathname = usePathname();
  const orgSlug = useOrganizationSlug();
  const req = authClient.useSession();
  const activeOrgId = req.data?.session?.activeOrganizationId;
  // Track the last stable (non-empty) organization id to avoid losing switch signal
  // when session temporarily reports null/undefined during transitions.
  const prevOrgIdRef = useRef<string | null | undefined>(activeOrgId);

  // Invalidate queries when active organization changes
  useEffect(() => {
    const prevOrgId = prevOrgIdRef.current;
    const nextOrgId = activeOrgId;
    // Only handle real organization switch (A -> B), not first login hydration (null/undefined -> A).
    const isRealOrgSwitch = Boolean(
      prevOrgId && nextOrgId && prevOrgId !== nextOrgId
    );
    if (isRealOrgSwitch) {
      queryClient.invalidateQueries();
      queryClient.refetchQueries();

      authClient.organization.list().then(({ data }) => {
        const nextOrg = data?.find((org) => org.id === nextOrgId);
        if (!nextOrg?.slug) return;

        const segments = pathname.split('/').filter(Boolean);
        const firstSegment = segments[0] || '';
        const query = window.location.search || '';
        // Keep global routes as-is; these routes should never be org-prefixed.
        if (!orgSlug && NON_ORG_PREFIX_ROUTE_SEGMENTS.has(firstSegment)) {
          router.push(`/${segments.join('/')}${query}`);
          return;
        }
        const restPath = orgSlug
          ? segments.slice(1).join('/')
          : (segments.join('/') || 'applications');
        router.push(`/${nextOrg.slug}/${restPath}${query}`);
      });
    }
    // Keep the last stable org id; ignore transient empty states.
    if (nextOrgId) {
      prevOrgIdRef.current = nextOrgId;
    }
  }, [activeOrgId, orgSlug, pathname, router]);

  return (
    <div className="flex items-center gap-2">
      {req.data?.user.id && (
        <OrganizationSwitcher
          variant="secondary"
          size="icon"
          hidePersonal
          createOrganizationDialog={({ open, onOpenChange }) => (
            <CreateOrganizationModal open={open} onOpenChange={onOpenChange} />
          )}
        />
      )}
      <UserButton size="icon" />
    </div>
  );
};

export default UserMenu;
