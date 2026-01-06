import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface OrganizationCardProps {
  icon: ReactNode;
  iconBg?: string;
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
}

export const OrganizationCard = ({
  icon,
  iconBg = 'bg-primary/10',
  title,
  description,
  action,
  children,
}: OrganizationCardProps) => {
  return (
    <div
      className={cn(
        'border rounded-lg p-6 md:p-8 bg-card shadow-sm hover:shadow-md transition-shadow'
      )}
    >
      <div className="flex gap-4 md:gap-6">
        {/* Icon Column */}
        <div className="shrink-0">
          <div className={cn('p-2 rounded-md', iconBg)}>{icon}</div>
        </div>
        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {title}
              </h2>
              <p className={cn('text-muted-foreground', children && 'mb-4')}>
                {description}
              </p>
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
