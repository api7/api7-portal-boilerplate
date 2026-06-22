import { type FC, type ReactNode } from 'react';

import Time, { type TimeProps } from './time';
import { ViewID, type ViewIDProps } from './view-id';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export type MetaCardProps = {
  name?: string;
  description?: string;
  status?: ReactNode;
  time?: Omit<TimeProps, 'isLoading'>;
  viewID?: ViewIDProps;
  action?: ReactNode;
  labels?: Record<string, string>;
  customLabels?: ReactNode;
  isLoading?: boolean;
  tag?: ReactNode;
  avatar?: ReactNode;
};

export const MetaCard: FC<MetaCardProps> = (props) => {
  const {
    name,
    description,
    time,
    action,
    labels,
    customLabels,
    status,
    isLoading,
    viewID,
    tag,
    avatar,
  } = props;

  return (
    <div className="card-container">
      <div className="flex gap-4 w-full flex-shrink-0" data-testid="meta">
        {avatar && <div className="shrink-0">{avatar}</div>}
        <div className="flex flex-col justify-between w-0 flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <div className="mr-3 w-0 flex-1">
              <div className="flex items-center mb-1">
                <div
                  className="font-semibold text-lg text-foreground leading-none h-fit"
                  data-testid="meta-name"
                >
                  {isLoading ? (
                    <Skeleton className="w-64 h-7" />
                  ) : (
                    <span className="break-words">{name}</span>
                  )}
                </div>
                {!!tag && <div className="ml-2">{tag}</div>}
                <div className="flex ml-2" data-cy="meta-status">
                  {status || (isLoading && <Skeleton className="w-20 h-5" />)}
                </div>
              </div>

              <div className="text-muted-foreground text-xs w-full" data-cy="meta-desc">
                {isLoading ? <Skeleton className="w-72 h-6" /> : description}
              </div>
            </div>
            <div>{isLoading ? <Skeleton className="w-24 h-8" /> : action}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              {customLabels ?? (
                <div className="flex flex-wrap gap-2">
                  {isLoading
                    ? Array.from({ length: 3 }, (d, i) => (
                        <Skeleton className="w-8 h-5" key={`sk_${i}`} />
                      ))
                    : Object.keys(labels || {}).map((key) => (
                        <Badge variant="secondary" key={key}>
                          {`${key}:${labels?.[key]}`}
                        </Badge>
                      ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              {viewID && <ViewID data={viewID.data} viewText={viewID.viewText} />}
              {time && <Time {...time} isLoading={isLoading} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
