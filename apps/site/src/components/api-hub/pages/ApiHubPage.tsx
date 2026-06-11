'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  type OrganizationAuthClient,
  useAuth,
  useListOrganizations,
} from '@better-auth-ui/react';
import CardList from '@/components/api-hub/card-list';
import Filter from '@/components/api-hub/Filter';
import ProductCard from '@/components/api-hub/ProductCard';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import useProductList from '@/lib/query/useProductList';
import { cn } from '@/lib/utils';
import type { ApiProductListItem as ProductResVal } from '@/types/portal-sdk';
import { Check, ChevronDown, Eye, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function OrgSelector() {
  const { authClient } = useAuth();
  const { data: orgs } = useListOrganizations(authClient as OrganizationAuthClient);
  const currentSlug = useOrganizationSlug();
  const router = useRouter();

  if (!orgs?.length) return null;

  const selectedOrg = orgs.find((o) => o.slug === currentSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <Eye className="size-4 text-muted-foreground" />
        {selectedOrg ? (
          <>
            <span className="text-muted-foreground">View as:</span>
            <span>{selectedOrg.name}</span>
          </>
        ) : (
          <span>Public view</span>
        )}
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuItem onClick={() => router.push(PATH_API_HUB)}>
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 whitespace-nowrap">Public view</span>
          {!selectedOrg && <Check className="ml-auto size-4 shrink-0" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>View as</DropdownMenuLabel>
          {orgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => router.push(`/${org.slug}${PATH_API_HUB}`)}
            >
              <span className="flex-1 whitespace-nowrap">{org.name}</span>
              {selectedOrg?.id === org.id && <Check className="ml-auto size-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const Products = () => {
  const {
    data,
    pagination,
    isLoading,
    isValidating,
    refetch,
    onParamsChange,
    params,
  } = useProductList({
    initParams: DEFAULT_LIST_PARAMS,
    savePage: true,
  });

  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:flex-row',
        isLoading && 'min-h-[50vh]'
      )}
    >
      <Filter
        onParamsChange={onParamsChange}
        defaultFilter={params.subscription_status}
      />
      <CardList<ProductResVal>
        CardItem={ProductCard}
        data={data as ProductResVal[]}
        isLoading={isLoading}
        isValidating={isValidating}
        pagination={pagination}
        reload={refetch}
        onParamsChange={onParamsChange}
        showSearch
        defaultSearch={params.search}
        searchPrefix={<OrgSelector />}
        skeletonCount={params.page_size}
        className="card-container"
      />
    </div>
  );
};

export default function ApiHubPage() {
  return (
    <Suspense>
      <Products />
    </Suspense>
  );
}
