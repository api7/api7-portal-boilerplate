'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PATH_ROOT } from '@/constants/path-prefix';

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
          <Image
            src="/code/404.svg"
            alt="Error 404 not found Illustration"
            width={449}
            height={449}
            className="min-h-[432.35px] min-w-[449.92px]"
            unoptimized
            loading="eager"
          />
        </div>
      </motion.div>
      <div className="text-center my-4">
        <Button onClick={goHome} className="w-32.25">
          Go Back
        </Button>
      </div>
    </>
  );
};

export const PageNotFound = BarePageNotFound;
