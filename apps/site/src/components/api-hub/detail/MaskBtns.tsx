import SubscribeAPIProductApplicationModal from '@/components/applications/components/SubscribeAPIProductApplicationModal';
import { PATH_LOGIN } from '@/constants/path-prefix';
import useDisclosure from '@/lib/hooks/useDisclosure';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export const BareBlurPlaneButton = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => (
  <div className="w-full h-full z-100 absolute left-0 top-0 flex justify-center items-center">
    <button
      {...props}
      className={cn(
        'bg-primary font-medium text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400',
        props.className
      )}
    />
  </div>
);
export const LoginThenSubscribeToUnlock = () => {
  const router = useRouter();
  return (
    <BareBlurPlaneButton onClick={() => {
      const { pathname, search, hash } = window.location;
      const pathAndQuery = `${pathname}${search}${hash}`;
      const redirectToParam = encodeURIComponent(pathAndQuery);
      return router.push(`${PATH_LOGIN}?redirectTo=${redirectToParam}`);
    }}>
      Login Then Subscribe To Unlock
    </BareBlurPlaneButton>
  );
};
export const WaitingForApproval = () => (
  <BareBlurPlaneButton
    className={cn(
      'cursor-not-allowed bg-gray-100 border-solid border-[1px] border-gray-500 text-gray-600 hover:bg-gray-200 focus:ring-gray-300 shadow-gray-300'
    )}
    disabled
  >
    Waiting For Approval
  </BareBlurPlaneButton>
);
export const SubscribeToUnlock = ({
  productId,
  onSuccess,
}: {
  productId: string;
  onSuccess?: () => void;
}) => {
  const subscribeDisclosure = useDisclosure();
  return (
    <>
      <BareBlurPlaneButton onClick={subscribeDisclosure.onOpen}>
        Subscribe To Unlock
      </BareBlurPlaneButton>
      <SubscribeAPIProductApplicationModal
        {...subscribeDisclosure}
        productId={productId}
        onSuccess={onSuccess}
      />
    </>
  );
};
