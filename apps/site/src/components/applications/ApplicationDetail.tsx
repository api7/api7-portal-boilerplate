'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { useConfigStatus } from '@/lib/config/config-status-context';
import ApplicationDeleteModal from '@/components/applications/ApplicationDeleteModal';
import ApplicationEditDrawer from '@/components/applications/ApplicationEditDrawer';
import { ApplicationCredentials } from '@/components/credentials';
import Back from '@/components/base/back';
import { MetaCard } from '@/components/base/meta-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PATH_APPLICATIONS } from '@/constants/path-prefix';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import useDisclosure from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import useApplicationDetail from '@/lib/query/useApplicationDetail';
import ApplicationSubscriptions from './components/ApplicationSubscriptions';
import ApplicationUsage from './components/Usage';

// URL param value → internal tab key
const PARAM_TO_TAB: Record<string, string> = {
  subscriptions: 'subscriptions',
  authentication: 'credentials',
  usage: 'usage',
};
// Internal tab key → URL param value
const TAB_TO_PARAM: Record<string, string> = {
  subscriptions: 'subscriptions',
  credentials: 'authentication',
  usage: 'usage',
};

const DetailTabs = ({ applicationId }: { applicationId: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applicationDetail } = useConfigStatus();

  const items = useMemo(() => {

    // Automatically determine whether to show credentials tab based on whether any credentialsTabs are enabled
    const credentialsTabs = applicationDetail?.credentialsTabs;
    const hasEnabledCredentialsTab =
      credentialsTabs?.keyAuth ||
      credentialsTabs?.basicAuth ||
      credentialsTabs?.oauth;

    const allTabs = [
      {
        key: 'subscriptions',
        label: 'Subscriptions',
        children: <ApplicationSubscriptions id={applicationId} />,
        enabled: applicationDetail?.subscriptions !== false,
      },
      {
        key: 'credentials',
        label: 'Authentication Type',
        children: <ApplicationCredentials applicationId={applicationId} />,
        enabled: hasEnabledCredentialsTab,
      },
      {
        key: 'usage',
        label: 'Usage',
        children: <ApplicationUsage id={applicationId} />,
        enabled: applicationDetail?.usage !== false,
      },
    ];

    return allTabs.filter((tab) => tab.enabled);
  }, [applicationId, applicationDetail]);

  const tabParam = searchParams.get('tab');
  const activeKey = tabParam ? PARAM_TO_TAB[tabParam] : undefined;
  const effectiveKey = (activeKey && items.find((t) => t.key === activeKey))
    ? activeKey
    : items[0]?.key;

  const handleTabChange = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', TAB_TO_PARAM[key] ?? key);
    if (key !== 'credentials') params.delete('authtype');
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="card-container">
      <Tabs value={effectiveKey} onValueChange={handleTabChange}>
        <TabsList variant="line">
          {items.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
        {items.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>{tab.children}</TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const ApplicationDetail = ({ id }: { id: string }) => {
  const router = useRouter();
  const orgSlug = useOrganizationSlug();
  const { canManageApplications } = useCanManageApplications();
  const req = useApplicationDetail({ id });
  const editDisclosure = useDisclosure({ onClose: req.refetch });
  const deleteDisclosure = useDisclosure({ onClose: req.refetch });

  return (
    <>
      <Back
        onClick={() =>
          router.push(
            `/${orgSlug}${PATH_APPLICATIONS}`,
          )
        }
      />
      <MetaCard
        {...req.data}
        viewID={{
          data: [{ id: req.data?.id ?? '', label: 'ID' }],
        }}
        time={{
          created_at: req.data?.created_at,
          updated_at: req.data?.updated_at,
        }}
        action={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    aria-label="More actions"
                    disabled={!canManageApplications}
                  >
                    Actions
                    <ChevronDownIcon />
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuItem
                  data-testid="application-edit-basics"
                  onClick={() => editDisclosure.setOpen()}
                >
                  Edit Basics
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="application-delete"
                  variant="destructive"
                  onClick={() => deleteDisclosure.setOpen()}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        isLoading={req.status === 'pending'}
      />

      <DetailTabs applicationId={id} />
      <ApplicationEditDrawer {...editDisclosure} data={req.data} />
      <ApplicationDeleteModal
        {...deleteDisclosure}
        id={req.data?.id}
        name={req.data?.name}
      />
    </>
  );
};

export default ApplicationDetail;
