'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import ApplicationDeleteModal from '@/components/applications/ApplicationDeleteModal';
import ApplicationEditDrawer from '@/components/applications/ApplicationEditDrawer';
import ApplicationSubscriptions from './components/ApplicationSubscriptions';
import ApplicationUsage from './components/Usage';
import { ApplicationCredentials } from '@/components/credentials';
import { AuthOrPageNotFound } from '@/components/slices/NotFound';
import { Meta } from '@/components/ui-legacy/meta-section';
import { MoreMenu } from '@/components/ui-legacy/more-menu';
import Back from '@/components/ui-legacy/back';
import A7Tabs from '@/components/ui-legacy/tabs';
import { PATH_APPLICATIONS } from '@/constants/path-prefix';
import useDisclosure from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import useApplicationDetail from '@/lib/query/useApplicationDetail';
import { authClient } from '@/lib/auth/client';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import { configStatusQueryOptions } from '@/apis/query-option';

const DetailTabs = ({ applicationId }: { applicationId: string }) => {
  const { data: configStatus } = useQuery(configStatusQueryOptions);
  
  const items = useMemo(() => {
    const applicationDetail = configStatus?.applicationDetail

    // Automatically determine whether to show credentials tab based on whether any credentialsTabs are enabled
    const credentialsTabs = applicationDetail?.credentialsTabs
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
  }, [applicationId, configStatus?.applicationDetail]);

  return (
    <div className="card-container">
      <A7Tabs type="line" items={items} />
    </div>
  );
};

const ApplicationDetail = ({ id }: { id: string }) => {
  const router = useRouter();
  const orgSlug = useOrganizationSlug();
  const { data: session } = authClient.useSession();
  const { canManageApplications } = useCanManageApplications();
  const isAuthorized = !!session?.user;
  const req = useApplicationDetail({ id });
  const editDisclosure = useDisclosure({ onClose: req.refetch });
  const deleteDisclosure = useDisclosure({ onClose: req.refetch });

  const moreMenuItems = [
    {
      key: 'edit-basics',
      label: 'Edit Basics',
      disabled: !canManageApplications,
      onClick: () => {
        editDisclosure.setOpen();
      },
      'data-testid': 'application-edit-basics',
    },
    {
      key: 'delete',
      label: <span className="text-red-500">Delete</span>,
      disabled: !canManageApplications,
      onClick: () => {
        deleteDisclosure.setOpen();
      },
      'data-testid': 'application-delete',
    },
  ];

  return (
    <AuthOrPageNotFound
      isAuthorized={isAuthorized}
      loading={req.status === 'pending'}
    >
      <Back
        onClick={() =>
          router.push(orgSlug ? `/${orgSlug}${PATH_APPLICATIONS}` : PATH_APPLICATIONS)
        }
      />
      <Meta
        {...req.data}
        viewID={{
          data: [{ id: req.data?.id ?? '', label: 'ID' }],
        }}
        time={{
          created_at: req.data?.created_at,
          updated_at: req.data?.updated_at,
        }}
        action={
          <MoreMenu
            items={moreMenuItems}
            type="actions"
            menuButtonProps={{ disabled: !canManageApplications }}
          />
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
    </AuthOrPageNotFound>
  );
};

export default ApplicationDetail;
