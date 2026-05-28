import { type FC, type ReactNode } from 'react';

import Time, { type TimeProps } from './time';
import { ViewID, type ViewIDProps } from './view-id';
import A7Label from '@/components/api7/api7-label';
import { Skeleton } from '../../ui/skeleton';

export type MetaProps = {
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
};

export const Meta: FC<MetaProps> = (props) => {
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
  } = props;

  return (
    <div className="card-container">
      <div className="flex gap-4 w-full flex-shrink-0" data-testid="meta">
        <div className="flex flex-col justify-between w-0 flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <div className="mr-3 w-0 flex-1">
              <div className="flex items-center mb-1">
                {/* name */}
                <div
                  className="font-semibold text-lg text-gray-800 leading-none h-fit"
                  data-cy="meta-name"
                >
                  {isLoading ? (
                    <Skeleton className="w-64 h-7" />
                  ) : (
                    <span className="break-words">{name}</span>
                  )}
                </div>
                {!!tag && <div className="ml-2">{tag}</div>}
                {/* status */}
                <div className="flex ml-2" data-cy="meta-status">
                  {status || (isLoading && <Skeleton className="w-20 h-5" />)}
                </div>
              </div>

              {/* description */}
              <div className="text-gray-400 text-xs w-full" data-cy="meta-desc">
                {isLoading ? <Skeleton className="w-72 h-6" /> : description}
              </div>
            </div>
            <div>{isLoading ? <Skeleton className="w-24 h-8" /> : action}</div>
          </div>

          <div className="flex justify-between items-center">
            {/* labels */}
            {customLabels ?? (
              <div className="flex gap-2 flex-1 flex-wrap">
                <div className="flex flex-wrap gap-2">
                  {isLoading
                    ? Array.from({ length: 3 }, (d, i) => (
                        <Skeleton className="w-8 h-5" key={`sk_${i}`} />
                      ))
                    : Object.keys(labels || {}).map((key) => (
                        <A7Label color="blue" key={key}>
                          {`${key}:${labels?.[key]}`}
                        </A7Label>
                      ))}
                </div>
              </div>
            )}

            {viewID && <ViewID data={viewID.data} viewText={viewID.viewText} />}
            <div className="flex gap-2 whitespace-nowrap">
              {time && <Time {...time} isLoading={isLoading} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

