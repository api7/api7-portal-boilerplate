import { useTheme } from 'next-themes';
import {
  LoginThenSubscribeToUnlock,
  SubscribeToUnlock,
  WaitingForApproval,
} from './MaskBtns';
import { usePreventHashScroll } from './usePreventHashScroll';
import ScalarDocs from './ScalarDocs';
import { ApiProductGateway, useParsedProduct } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';
import { placeholderOpenAPI } from '@/constants/placeholder-openapi';
import { authClient } from '@/lib/auth/client';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import useProductDetail from '@/lib/query/useProductDetail';

type RealDocProps = {
  data: ApiProductGateway;
};

const ProductGatewayRealDoc = ({ data }: RealDocProps) => {
  const parsed = useParsedProduct(data);
  const { resolvedTheme } = useTheme();
  const scalarDocsKey = `${resolvedTheme}:${JSON.stringify(parsed.authentication)}`;

  return (
    <div className="border border-base-300 dark:border-base-200 w-full min-h-[80vh] relative">
      {parsed.isLoading ? (
        <Skeleton className="w-full h-full absolute left-0 top-0 z-10" />
      ) : (
        <ScalarDocs
          key={scalarDocsKey}
          configuration={{
            hideDarkModeToggle: true,
            darkMode: false,
            forceDarkModeState: resolvedTheme === 'dark' ? 'dark' : 'light',
            defaultOpenAllTags: false,
            sources: parsed.openAPIs.map((v) => ({
              title: v.title,
              content: v.str,
            })),
            authentication: parsed.authentication,
          }}
        />
      )}
    </div>
  );
};

const ProductGatewayMockDoc = () => {
  usePreventHashScroll();
  const { resolvedTheme } = useTheme();
  return (
    <div className="blur-sm pointer-events-none">
      <ScalarDocs
        key={resolvedTheme}
        configuration={{
          darkMode: false,
          hideDarkModeToggle: true,
          defaultOpenAllTags: false,
          content: placeholderOpenAPI,
          hideTestRequestButton: true,
          forceDarkModeState: resolvedTheme === 'dark' ? 'dark' : 'light',
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
const ProductGatewayAPI = ({ id }: { id: string }) => {
  const session = authClient.useSession();
  const authorized = !!session.data?.user;
  const { data } = useProductDetail(id);
  const subscribedApps = useSubscriptionList({
    api_product_id: id,
    status: ['subscribed'],
  });
  const waitingForApprovalApps = useSubscriptionList({
    api_product_id: id,
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
