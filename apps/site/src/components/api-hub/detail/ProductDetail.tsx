'use client';

import { useCreation } from 'ahooks';
import { map, pick } from 'lodash-es';

import ProductExternalAPI from './ProductExternalAPI';
import ProductGatewayAPI from './ProductGatewayAPI';
import ProductSubscriptions from './ProductSubscriptions';
import Back from '@/components/ui/back';
import Meta, { type MetaProps } from '@/components/ui/meta';
import { Skeleton } from '@/components/ui/skeleton';
import A7Tabs from '@/components/ui/tabs';
import { PATH_API_HUB } from '@/constants/path-prefix';
import useProductDetail, {
  type UseProductDetailReturn,
} from '@/lib/query/useProductDetail';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { AuthOrPageNotFound } from '@/components/slices/NotFound';

type Props = {
  req: UseProductDetailReturn;
};

const MetaPart = (props: Props) => {
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
  const { req } = props;
  const product_id = useSearchParams().get('id')!;
  const subscribedApps = useSubscriptionList({
    api_product_id: product_id,
    status: ['subscribed'],
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
      {req.data?.type === 'external' && <ProductExternalAPI />}
      {req.data?.type === 'gateway' && <ProductGatewayAPI />}
    </div>
  );
};

const MainPart = ({ req }: Props) => {
  const session = authClient.useSession();
  const isGatewayProduct = req.data?.type === 'gateway';
  const items = [
    {
      key: 'openapi',
      label: 'OpenAPI Specification',
      children: <OpenAPISpecTabContent req={req} />,
    },
    // Only show Subscriptions tab for gateway products (external products cannot be subscribed)
    ...(session.data?.user && isGatewayProduct
      ? [
          {
            key: 'subscriptions',
            label: 'Subscriptions',
            children: <ProductSubscriptions />,
          },
        ]
      : []),
  ];

  return (
    <>
      <MetaPart req={req} />
      <A7Tabs
        type="line"
        className="card-container p-4 relative"
        items={items}
      />
    </>
  );
};

const AuthProductDetail = ({ id }: { id: string }) => {
  const router = useRouter();
  const req = useProductDetail(id);
  const session = authClient.useSession();
  const isAuthorized = !!session.data?.user;
  const canViewPage = useCreation(() => {
    return (
      req.data?.visibility === 'public' ||
      (req.data?.visibility === 'logged_in' && isAuthorized)
    );
  }, [req.data?.visibility, isAuthorized]);

  return (
    <AuthOrPageNotFound
      isAuthorized={canViewPage}
      loading={req.status === 'pending'}
    >
      <Back onClick={() => router.push(PATH_API_HUB)} />
      <MainPart req={req} />
    </AuthOrPageNotFound>
  );
};

export default AuthProductDetail;
