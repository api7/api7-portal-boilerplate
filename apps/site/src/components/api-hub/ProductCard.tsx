import { map } from 'lodash-es';
import { NetworkIcon } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/base/status-badge';
import { Badge } from '@/components/ui/badge';
import { MetaCardAvatar } from '@/components/base/meta-card/avatar';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useApiHubBasePath } from '@/lib/hooks/useApiHubBasePath';
import type {
  ApiProductListItem,
  ProductSubscriptionStatus as SubscriptionStatus,
} from '@/types/portal-sdk';

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
    <div className="flex h-fit shrink-0 align-middle justify-center py-1.25 mb-1">
      <StatusBadge color={tagColor}>
        {tagText}
      </StatusBadge>
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
      href={`${apiHubBasePath}/${id}`}
    >
      <CardHeader className="pt-6 pb-4 px-6">
        <div className="gap-2 flex min-w-0 items-start">
          <MetaCardAvatar
            {...props}
            {...(props.type === 'gateway' && { src: props.logo })}
            isLoading={!id}
          />
          <div className="flex min-w-0 flex-1 flex-col items-start text-left">
            <div className="flex w-full min-w-0 items-start gap-2 text-left">
              <div className="min-w-0 max-w-full overflow-hidden">
                <Tooltip>
                  <TooltipTrigger>
                    <h3 className="mb-1! block! truncate text-lg! text-primary-content! [text-left] font-medium">
                      {name}
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <small className="text-sm leading-none font-medium">
                      {name}
                    </small>
                  </TooltipContent>
                </Tooltip>
              </div>
              {subscription_status !== 'unsubscribed' && (
                <SubsStatusTag subscription_status={subscription_status} />
              )}
            </div>
            <div className="flex w-full min-w-0 overflow-hidden text-left leading-6 gap-1">
              {(finalTags?.slice(0, 3) ?? []).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="min-w-0 flex-1 rounded-sm text-secondary-content bg-muted [overflow-wrap:anywhere]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3  px-6 flex-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <p className="m-0 overflow-hidden text-sm leading-5.5 text-neutral-content [display:-webkit-box] wrap-anywhere [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {desc}
              </p>
            }
          />
          <TooltipContent side="top">
            <small className="text-sm leading-none font-medium">{desc}</small>
          </TooltipContent>
        </Tooltip>
      </CardContent>
      <CardFooter className="px-6 py-2.5 flex justify-between bg-card rounded-b text-neutral-content">
        <div className="flex min-w-0 gap-2 items-center">
          <NetworkIcon className="size-5 shrink-0" />
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
  props: ApiProductListItem & { reload: () => void; isLoading: boolean },
) => {
  const { isLoading } = props;

  if (isLoading) {
    return (
      <Card className="bg-card h-full flex flex-col">
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
          <div className="px-6 py-2.5 flex justify-between bg-card rounded-b">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card h-full min-w-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]">
      <TooltipProvider>
        <ProductCard {...props} />
      </TooltipProvider>
    </Card>
  );
};

export default ProductCardWrapper;
