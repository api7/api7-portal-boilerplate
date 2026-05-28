'use client';

import type { PropsWithChildren } from 'react';

import { Button } from 'antd';
import { motion } from 'framer-motion';

import { BareIconImage } from '../ui-legacy/icon-image';
import Loading from '../ui-legacy/loading';
import { useRouter } from 'next/navigation';
import { PATH_ROOT } from '@/constants/path-prefix';
import { authClient } from '@/lib/auth/client';

export const BarePageNotFound = () => {
  const router = useRouter();
  type F = React.MouseEventHandler<HTMLElement>;
  const goHome: F = (e) => (e.stopPropagation(), router.push(PATH_ROOT));
  return (
    <>
      <motion.div
        animate={{ y: 20 }}
        transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
        className="h-[70vh] mx-0 my-auto"
      >
        <div className="h-full w-full flex justify-center items-center">
          <BareIconImage
            className="min-h-[432.35px] min-w-[449.92px]"
            size={449}
            src="/code/404.svg"
            alt="Error 404 not found Illustration"
          />
        </div>
      </motion.div>
      <div className="text-center my-4">
        <Button onClick={goHome} type="primary" className="w-[129px]">
          Go Back
        </Button>
      </div>
    </>
  );
};

export const PageNotFound = BarePageNotFound;
type AuthOrPageNotFoundProps = PropsWithChildren<{
  isAuthorized?: boolean;
  loading?: boolean;
}>;
export const AuthOrPageNotFound = (props: AuthOrPageNotFoundProps) => {
  const { data, isPending } = authClient.useSession();
  const { isAuthorized = !!data?.user, loading = isPending, children } = props;
  if (loading) return <Loading />;
  if (!isAuthorized) return <BarePageNotFound />;
  return children;
};
