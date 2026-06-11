'use client';

import { cn } from '@/lib/utils';

type Props = {
  children?: React.ReactNode;
  onSubmit?: () => void;
  className?: string;
};

const Form = ({ children, onSubmit, className }: Props) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit?.();
    }}
    className={cn('flex flex-col gap-4', className)}
  >
    {children}
  </form>
);

export default Form;
