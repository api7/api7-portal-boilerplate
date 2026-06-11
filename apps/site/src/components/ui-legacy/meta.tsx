import type { FC, ReactNode } from 'react';

import A7LabelList from '../api7/api7-label-list';
import { CopyButton } from '../api-hub/CopyButton';
import ProductAvatar from '../api-hub/ProductAvatar';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

type IDProps = WithLoading<{ id?: string }>;

const ID: FC<IDProps> = (props) => {
  const { id, isLoading } = props;
  if (isLoading) return <Skeleton className="w-80 h-4" />;
  if (!id) return null;
  return (
    <div className="flex items-center text-xs text-neutral-content gap-1">
      <div>ID:</div>
      <span>{id}</span>
      <CopyButton content={id} />
    </div>
  );
};

export type MetaAvatarProps = WithLoading<{
  name: string;
  src?: string;
  size?: number;
}>;

export const MetaAvatar = (props: MetaAvatarProps) => {
  const { isLoading, name, src, size = 64 } = props;
  if (isLoading || !name)
    return <Skeleton style={{ width: size, height: size }} />;
  return src ? (
    <Image
      src={src}
      width={size}
      height={size}
      alt={name}
      className="rounded overflow-hidden"
      unoptimized
    />
  ) : (
    <ProductAvatar text={name} width={size} height={size} />
  );
};

export const MetaDesc = (props: Pick<MetaProps, 'isLoading' | 'desc'>) => {
  const { desc, isLoading } = props;
  return (
    <div className="text-gray-400 text-xs w-1/2" data-testid="meta-desc">
      {isLoading && desc ? <Skeleton className="w-full h-4" /> : desc}
    </div>
  );
};

export type MetaProps = WithLoading<
  {
    name?: React.ReactNode;
    desc?: React.ReactNode;
    status?: ReactNode;
    // time?: ReactNode;
    action?: ReactNode;
    labels?: string[];
    showAvatar?: boolean;
  } & IDProps &
    MetaAvatarProps
>;

const Meta: FC<MetaProps> = (props) => {
  const { name, id, isLoading = true, showAvatar = true } = props;

  return (
    <div className="flex gap-4 w-full flex-shrink-0">
      {showAvatar && <MetaAvatar {...props} />}
      <div className="flex flex-col justify-between flex-1 ">
        <div className="flex justify-between items-center ">
          <div className="flex-1">
            <div className="flex items-center">
              {/* name */}
              <div
                className="text-primary-content font-semibold text-lg h-fit mr-2"
                data-testid="meta-name"
              >
                {isLoading && <Skeleton className="w-56 h-7" />}
                {!isLoading && <span>{name}</span>}
              </div>
              {/* status */}
              {props?.status && (
                <div className="flex" data-testid="meta-status">
                  {props.status}
                </div>
              )}
            </div>
            <MetaDesc {...props} />
          </div>
          {props?.action && <div>{props?.action}</div>}
        </div>
        <div className="flex justify-between">
          <div>
            {props?.labels && (
              <A7LabelList
                limitCount={Number.MAX_SAFE_INTEGER}
                data={props?.labels}
              />
            )}
          </div>
          <div className="flex gap-2 whitespace-nowrap">
            <ID id={id} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Meta;
