import { AlertTriangleIcon, InfoIcon } from 'lucide-react';

import {
  AlertDescription,
  AlertTitle,
  Alert as SAlert,
} from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const myVariant = {
  default: null, // built-in variant, no need to override
  destructive: null, // built-in variant, no need to override
  info: {
    className:
      'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-50',
    icon: <InfoIcon />,
  },
} as const;

export type AlertProps = {
  variant?: keyof typeof myVariant;
  title?: string;
  description?: string | React.ReactNode;
};

const Alert = (props: AlertProps) => {
  const { variant, title, description } = props;
  return (
    <SAlert
      className={cn(myVariant[variant || 'info']?.className)}
      variant={variant === 'destructive' ? variant : 'default'}
    >
      {myVariant[variant || 'info']?.icon || <AlertTriangleIcon />}
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
    </SAlert>
  );
};

export default Alert;
