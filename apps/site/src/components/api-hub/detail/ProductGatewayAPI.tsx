import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LoginThenSubscribeToUnlock,
  SubscribeToUnlock,
  WaitingForApproval,
} from './MaskBtns';
import { usePreventHashScroll } from './usePreventHashScroll';
import ScalarDocs from './ScalarDocs';
import { ApiProductGateway, useParsedProduct } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';
import A7Tabs from '@/components/ui/tabs';
import { placeholderOpenAPI } from '@/constants/placeholder-openapi';
import { authClient } from '@/lib/auth/client';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import { cn } from '@/lib/utils';
import useProductDetail from '@/lib/query/useProductDetail';

type RealDocProps = {
  data: ApiProductGateway;
};

const ProductGatewayRealDoc = ({ data }: RealDocProps) => {
  const [idx, setIdx] = useState(0);
  const parsed = useParsedProduct(data);

  return (
    <>
      <A7Tabs
        rootClassName="mb-0 [&>.ant-tabs-nav]:!mb-0"
        type="card"
        activeKey={String(idx)}
        onTabClick={(key) => setIdx(Number(key))}
        items={parsed.openAPIs?.map((v, index) => ({
          key: String(index),
          label: v.parsed.specification?.info.title,
        }))}
      />
      <div
        className={cn(
          'border border-base-300 dark:border-base-200',
          !!data?.raw_openapis?.length && 'border-t-0',
          'w-full min-h-[80vh] relative'
        )}
      >
        {parsed.isLoading ? (
          <Skeleton className="w-full h-full absolute left-0 top-0 z-10" />
        ) : (
          <ScalarDocs
            configuration={{
              hideDarkModeToggle: true,
              darkMode: false,
              forceDarkModeState: 'light',
              defaultOpenAllTags: false,
              content: parsed.openAPIs[idx].str,
              authentication: parsed.authentication,
            }}
          />
        )}
      </div>
    </>
  );
};

const ProductGatewayMockDoc = () => {
  usePreventHashScroll();
  return (
    <div className="blur-sm pointer-events-none">
      <ScalarDocs
        configuration={{
          darkMode: false,
          hideDarkModeToggle: true,
          defaultOpenAllTags: false,
          content: placeholderOpenAPI,
          hideTestRequestButton: true,
          forceDarkModeState: 'light',
        }}
      />
    </div>
  );
};

/**
 * here only handle can_view_unsubscribed + authorized,
 * visibility logic is handled in the parent component.
 *
 * if can_view_unsubscribed=true, authorized=false, return Real Doc
 * if can_view_unsubscribed=false
 *   if authorized=true, return Mock Doc + Sub Btn or Real Doc
 *   if authorized=false, return Mock Doc + Login Then Subscribe To Unlock
 */
const ProductGatewayAPI = () => {
  const session = authClient.useSession();
  const authorized = !!session.data?.user;
  const product_id = useSearchParams().get('id')!;
  const { data } = useProductDetail(product_id);
  const subscribedApps = useSubscriptionList({
    api_product_id: product_id,
    status: ['subscribed'],
  });
  const waitingForApprovalApps = useSubscriptionList({
    api_product_id: product_id,
    status: ['wait_for_approval'],
  });

  if (!data || data.type !== 'gateway') return null;
  if (subscribedApps.isLoading || waitingForApprovalApps.isLoading) {
    return <Skeleton className="w-full h-full absolute left-0 top-0 z-10" />;
  }
  const { can_view_unsubscribed } = data;
  if (can_view_unsubscribed) {
    return <ProductGatewayRealDoc data={data} />;
  }
  if (!can_view_unsubscribed && !authorized) {
    return (
      <>
        <ProductGatewayMockDoc />
        <LoginThenSubscribeToUnlock />
      </>
    );
  }
  if (!can_view_unsubscribed && authorized) {
    if (subscribedApps.total > 0) {
      return <ProductGatewayRealDoc data={data} />;
    }
    if (subscribedApps.total === 0 && waitingForApprovalApps.total > 0) {
      return (
        <>
          <ProductGatewayMockDoc />
          <WaitingForApproval />
        </>
      );
    }
    if (subscribedApps.total === 0 && waitingForApprovalApps.total === 0) {
      return (
        <>
          <ProductGatewayMockDoc />
          <SubscribeToUnlock
            productId={data.id}
            onSuccess={() => {
              subscribedApps.refetch();
              waitingForApprovalApps.refetch();
            }}
          />
        </>
      );
    }
  }
};
export default ProductGatewayAPI;
