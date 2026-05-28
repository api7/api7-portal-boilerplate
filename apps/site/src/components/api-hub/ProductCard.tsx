import { Tooltip, Typography } from 'antd';
import type { TitleProps } from 'antd/es/typography/Title';
import { map } from 'lodash-es';
import Link from 'next/link';

import A7Label from '@/components/api7/api7-label';
import A7LabelList from '@/components/api7/api7-label-list';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { BareIconImage } from '@/components/ui-legacy/icon-image';
import { MetaAvatar } from '@/components/ui-legacy/meta';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiHubBasePath } from '@/lib/hooks/useApiHubBasePath';
import { cn } from '@/lib/utils';
import type {
  ApiProductListItem,
  ProductSubscriptionStatus as SubscriptionStatus,
} from '@/types/portal-sdk';

export const ProductTitle = (
  props: WithLoading<Pick<ApiProductListItem, 'name'>> & TitleProps
) => {
  const { name, isLoading, ...titleProps } = props;
  if (isLoading) return <Skeleton className="w-1/2 h-6" />;
  return (
    <Typography.Title
      level={3}
      ellipsis={{ tooltip: name }}
      {...titleProps}
      className={cn('text-lg! mb-1!', titleProps.className)}
    >
      {name}
    </Typography.Title>
  );
};

const SubsStatusTag = (props: {
  subscription_status: Exclude<SubscriptionStatus, 'unsubscribed'>;
}) => {
  const { subscription_status } = props;
  const tagLabel = {
    subscribed: {
      color: 'green',
      text: 'Subscribed',
    },
    wait_for_approval: {
      color: 'orange',
      text: 'Wait For Approval',
    },
  };
  const tagText = tagLabel[subscription_status].text;
  const tagColor = tagLabel[subscription_status].color;

  return (
    <div className="flex h-fit shrink-0 align-middle justify-center py-[5px] mb-[4px]">
      <A7Label isStatus color={tagColor}>
        {tagText}
      </A7Label>
    </div>
  );
};

const ProductCard = (props: ApiProductListItem) => {
  const { name, id, desc = '', subscription_status = 'unsubscribed' } = props;
  const apiHubBasePath = useApiHubBasePath();
  const finalTags =
    props.type === 'external'
      ? props?.tags
      : map(props?.labels, (v, k) => `${k}:${v}`);

  return (
    <Link
      className="h-full min-w-0 flex flex-col"
      href={`${apiHubBasePath}/detail?id=${id}`}
    >
      <CardHeader className="pt-6 pb-4 px-6">
        <div className="gap-2 flex min-w-0 items-start">
          <MetaAvatar
            {...props}
            {...(props.type === 'gateway' && { src: props.logo })}
            isLoading={!id}
          />
          <div className="flex min-w-0 flex-1 flex-col items-start text-left">
            <div className="flex w-full min-w-0 items-start gap-2 text-left">
              <div className="min-w-0 max-w-full overflow-hidden">
                <Tooltip placement="top" arrow title={name}>
                  <Typography.Title
                    level={3}
                    className="mb-1! block! truncate text-lg! text-primary-content! [text-align:left]"
                  >
                    {name}
                  </Typography.Title>
                </Tooltip>
              </div>
              {subscription_status !== 'unsubscribed' && (
                <SubsStatusTag subscription_status={subscription_status} />
              )}
            </div>
            <div className="flex w-full min-w-0 overflow-hidden text-left leading-6">
              <A7LabelList
                limitCount={3}
                data={finalTags?.slice(0, 3) || []}
                labelOption={{
                  color: 'default',
                  className:
                    'min-w-0 flex-1 rounded-sm text-left text-secondary-content bg-gray-100',
                  style: {
                    paddingInline: 0,
                  },
                  textProps: {
                    className: 'max-w-full text-left [overflow-wrap:anywhere]',
                  },
                }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3  px-6 flex-1">
        <Tooltip placement="top" arrow title={desc}>
          <p className="m-0 overflow-hidden text-sm leading-[22px] text-neutral-content [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {desc}
          </p>
        </Tooltip>
      </CardContent>
      <CardFooter
        className="px-6 py-[10px] flex justify-between bg-white 
        dark:bg-gray-800 rounded-b text-neutral-content"
      >
        <div className="flex min-w-0 gap-2 items-center">
          <BareIconImage src="/icons/api-count.svg" size={20} alt="API Count" />
          <div className="min-w-0 truncate">API Count</div>
        </div>
        <div className="ml-2 max-w-[50%] min-w-0 truncate text-right">
          {props.api_count}
        </div>
      </CardFooter>
    </Link>
  );
};

const ProductCardWrapper = (
  props: ApiProductListItem & { reload: () => void; isLoading: boolean }
) => {
  const { isLoading } = props;

  if (isLoading) {
    return (
      <Card className="bg-gray-50 dark:bg-slate-800 h-full flex flex-col">
        <div className="h-full flex flex-col">
          <div className="pt-6 pb-4 px-6">
            <div className="flex gap-2 items-start">
              <Skeleton className="w-12 h-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
          <div className="pb-3 px-6 flex-1">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="px-6 py-[10px] flex justify-between bg-white dark:bg-gray-800 rounded-b">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-50 dark:bg-slate-800 h-full min-w-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]">
      <ProductCard {...props} />
    </Card>
  );
};

export default ProductCardWrapper;
