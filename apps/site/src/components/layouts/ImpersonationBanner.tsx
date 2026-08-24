import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@api7/portal-ui/components/ui/button';
import { PATH_DASHBOARD_ORGANIZATIONS } from '@/constants/path-prefix';
import { authClient } from '@/lib/auth/client';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';

type ImpersonationBannerProps = {
  email: string;
  orgs: { slug: string; name: string }[];
};

const ImpersonationBanner = ({ email, orgs }: ImpersonationBannerProps) => {
  const slug = useOrganizationSlug();
  const activeOrganizationName = slug
    ? (orgs.find((org) => org.slug === slug)?.name ?? null)
    : null;
  const [isExiting, setIsExiting] = useState(false);

  return (
    <div className="sticky top-0 z-60 border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-900 dark:text-amber-200">
            Currently in Impersonation Mode
            <span className="mx-1.5 text-amber-400 dark:text-amber-600">·</span>
            {activeOrganizationName && (
              <>
                <span className="font-medium">{activeOrganizationName}</span>
                <span className="mx-1.5 text-amber-400 dark:text-amber-600">
                  ·
                </span>
              </>
            )}
            <span className="text-amber-700 dark:text-amber-400">
              {email}
            </span>
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={isExiting}
          onClick={async () => {
            setIsExiting(true);
            try {
              const result = await authClient.admin.stopImpersonating();
              if (result.error) {
                toast.error(
                  result.error.message || 'Failed to exit impersonation mode',
                );
                setIsExiting(false);
                return;
              }
              window.location.assign(PATH_DASHBOARD_ORGANIZATIONS);
            } catch {
              setIsExiting(false);
            }
          }}
          className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:text-amber-950 dark:border-amber-800 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-900/40 dark:hover:text-amber-200"
        >
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
