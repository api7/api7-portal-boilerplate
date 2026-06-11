'use client';

import { map, pick } from 'lodash-es';

import ProductExternalAPI from './ProductExternalAPI';
import ProductGatewayAPI from './ProductGatewayAPI';
import ProductSubscriptions from './ProductSubscriptions';
import Back from '@/components/ui-legacy/back';
import Meta, { type MetaProps } from '@/components/ui-legacy/meta';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApiHubBasePath } from '@/lib/hooks/useApiHubBasePath';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import useProductDetail, {
  type UseProductDetailReturn,
} from '@/lib/query/useProductDetail';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

type Props = {
  req: UseProductDetailReturn;
  id: string;
};

type ReqProps = Pick<Props, 'req'>;

const MetaPart = (props: ReqProps) => {
  const { req } = props;
  const finalTags =
    req.data?.type === 'external'
      ? req.data?.tags
      : map(req.data?.labels, (v, k) => `${k}:${v}`);

  type BasicInfo = Required<Pick<MetaProps, 'name' | 'desc' | 'id'>>;
  return (
    <div className="card-container">
      <Meta
        isLoading={req.isLoading}
        {...(pick(req.data, ['name', 'desc', 'id']) as BasicInfo)}
        {...(req.data?.type === 'gateway' && { src: req.data?.logo })}
        labels={finalTags}
      />
    </div>
  );
};

const OpenAPISpecTabContent = (props: Props) => {
  const { req, id } = props;
  const orgSlug = useOrganizationSlug();
  const subscribedApps = useSubscriptionList({
    api_product_id: id,
    status: ['subscribed'],
    enabled: !!orgSlug,
  });

  return (
    <div
      className={cn(
        'card-container relative min-h-screen p-0',
        req.data?.type === 'gateway' &&
          !req.data.can_view_unsubscribed &&
          subscribedApps.total === 0 &&
          'h-[70vh] overflow-hidden'
      )}
    >
      {(req.isLoading || !req.data?.type) && (
        <Skeleton className="w-full h-full" />
      )}
      {req.data?.type === 'external' && <ProductExternalAPI id={id} />}
      {req.data?.type === 'gateway' && <ProductGatewayAPI id={id} />}
    </div>
  );
};

const MainPart = ({ req, id }: Props) => {
  const session = authClient.useSession();
  const orgSlug = useOrganizationSlug();
  const isGatewayProduct = req.data?.type === 'gateway';
  const items = [
    {
      key: 'openapi',
      label: 'OpenAPI Specification',
      children: <OpenAPISpecTabContent req={req} id={id} />,
    },
    // Only show Subscriptions tab for gateway products with an org context (external products cannot be subscribed; no-slug public pages have no developer identity)
    ...(orgSlug && session.data?.user && isGatewayProduct
      ? [
          {
            key: 'subscriptions',
            label: 'Subscriptions',
            children: <ProductSubscriptions id={id} />,
          },
        ]
      : []),
  ];

  return (
    <>
      <MetaPart req={req} />
      <Tabs defaultValue={items[0]?.key} className="card-container p-4 relative">
        <TabsList variant="line">
          {items.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
        {items.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>{tab.children}</TabsContent>
        ))}
      </Tabs>
    </>
  );
};

const AuthProductDetail = ({ id }: { id: string }) => {
  const router = useRouter();
  const apiHubBasePath = useApiHubBasePath();
  const req = useProductDetail(id);

  return (
    <>
      <Back onClick={() => router.push(apiHubBasePath)} />
      <MainPart req={req} id={id} />
    </>
  );
};

export default AuthProductDetail;
