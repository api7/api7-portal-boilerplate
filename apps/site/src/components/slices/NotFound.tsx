'use client';

import { useNavigate } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { PATH_ROOT } from '@/constants/path-prefix';

export const BarePageNotFound = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  type F = React.MouseEventHandler<HTMLElement>;
  const goHome: F = (e) => (e.stopPropagation(), navigate({ href: PATH_ROOT }));
  return (
    <>
      <motion.div
        animate={{ y: prefersReducedMotion ? 0 : 20 }}
        transition={
          prefersReducedMotion
            ? undefined
            : { repeat: Infinity, duration: 2, repeatType: 'reverse' }
        }
        className="h-[70vh] mx-0 my-auto"
      >
        <div className="h-full w-full flex justify-center items-center">
          <img
            src="/code/404.svg"
            alt="Error 404 not found Illustration"
            width={449}
            height={449}
            className="h-auto max-h-full max-w-full"
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
