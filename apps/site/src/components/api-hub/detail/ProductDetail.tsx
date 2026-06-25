'use client';

import { map } from 'lodash-es';
import { useRouter } from 'next/navigation';

import type { ApiProduct } from '@api7/portal-sdk/unstable-types';

import ProductExternalAPI from './ProductExternalAPI';
import ProductGatewayAPI from './ProductGatewayAPI';
import ProductSubscriptions from './ProductSubscriptions';
import { BadgeList } from '@/components/base/badge-list';
import Back from '@/components/base/back';
import { MetaCardAvatar } from '@/components/base/meta-card/avatar';
import { MetaCard } from '@/components/base/meta-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import { cn } from '@/lib/utils';
import { type ApiProductExternal, type ApiProductGateway } from '../utils';

type Props = {
  product: ApiProduct;
  id: string;
  isAuthenticated: boolean;
  basePath: string;
};

const MetaPart = ({ product }: { product: ApiProduct }) => {
  const finalTags =
    product.type === 'external'
      ? product.tags
      : map(product.labels, (v, k) => `${k}:${v}`);

  return (
    <MetaCard
      isLoading={false}
      name={product.name}
      description={product.desc}
      viewID={product.id ? { data: [{ id: product.id }] } : undefined}
      avatar={
        <MetaCardAvatar
          name={product.name ?? ''}
          src={product.type === 'gateway' ? product.logo : undefined}
          isLoading={false}
        />
      }
      customLabels={<BadgeList data={finalTags ?? []} />}
    />
  );
};

const OpenAPISpecTabContent = ({ product, id, isAuthenticated }: Omit<Props, 'basePath'>) => {
  const orgSlug = useOrganizationSlug();
  const subscribedApps = useSubscriptionList({
    api_product_id: id,
    status: ['subscribed'],
    enabled: !!orgSlug && isAuthenticated,
  });

  return (
    <div
      className={cn(
        'relative min-h-screen',
        product.type === 'gateway' &&
          !!orgSlug &&
          !(product as ApiProductGateway).can_view_unsubscribed &&
          subscribedApps.total === 0 &&
          'h-[70vh] overflow-hidden'
      )}
    >
      {product.type === 'external' && (
        <ProductExternalAPI data={product as ApiProductExternal} />
      )}
      {product.type === 'gateway' && (
        <ProductGatewayAPI data={product as ApiProductGateway} isAuthenticated={!!orgSlug && isAuthenticated} />
      )}
    </div>
  );
};

const MainPart = ({ product, id, isAuthenticated }: Omit<Props, 'basePath'>) => {
  const orgSlug = useOrganizationSlug();
  const isGatewayProduct = product.type === 'gateway';
  const items = [
    {
      key: 'openapi',
      label: 'OpenAPI Specification',
      children: <OpenAPISpecTabContent product={product} id={id} isAuthenticated={isAuthenticated} />,
    },
    ...(orgSlug && isAuthenticated && isGatewayProduct
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
      <MetaPart product={product} />
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

const ProductDetail = ({ product, id, isAuthenticated, basePath }: Props) => {
  const router = useRouter();

  return (
    <>
      <Back onClick={() => router.push(basePath)} />
      <MainPart product={product} id={id} isAuthenticated={isAuthenticated} />
    </>
  );
};

export default ProductDetail;
