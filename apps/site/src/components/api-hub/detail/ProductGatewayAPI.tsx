import { useTheme } from 'next-themes';
import {
  LoginThenSubscribeToUnlock,
  SubscribeToUnlock,
  WaitingForApproval,
} from './MaskBtns';
import { usePreventHashScroll } from './usePreventHashScroll';
import ScalarDocs from './ScalarDocs';
import { type ApiProductGateway, useParsedProduct } from '../utils';
import { Alert } from '@/components/base/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { placeholderOpenAPI } from '@/constants/placeholder-openapi';
import { useProductSubscriptionStatus } from '@/lib/query/product-subscription-status';

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
const ProductGatewayAPI = ({ data, isAuthenticated }: { data: ApiProductGateway; isAuthenticated: boolean }) => {
  const authorized = isAuthenticated;
  const { subscribedTotal, waitingTotal, isLoading, isError, refetch } =
    useProductSubscriptionStatus(data.id);

  if (isLoading) {
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
    if (isError) {
      return (
        <>
          <ProductGatewayMockDoc />
          <Alert
            variant="destructive"
            title="Failed to load subscription status"
            description="Reload the page to try again."
          />
        </>
      );
    }
    if (subscribedTotal > 0) {
      return <ProductGatewayRealDoc data={data} />;
    }
    if (subscribedTotal === 0 && waitingTotal > 0) {
      return (
        <>
          <ProductGatewayMockDoc />
          <WaitingForApproval />
        </>
      );
    }
    if (subscribedTotal === 0 && waitingTotal === 0) {
      return (
        <>
          <ProductGatewayMockDoc />
          <SubscribeToUnlock
            productId={data.id}
            onSuccess={() => void refetch()}
          />
        </>
      );
    }
  }
};
export default ProductGatewayAPI;
