'use client';

import { Check, ChevronDown, Eye, Globe } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import {
  type OrganizationAuthClient,
  useAuth,
  useListOrganizations,
} from '@better-auth-ui/react';

import CardList from '@/components/api-hub/card-list';
import Filter, { type FilterParamProps } from '@/components/api-hub/Filter';
import ProductCard from '@/components/api-hub/ProductCard';
import { ApiHubBasePathContext } from '@/components/api-hub/ApiHubBasePathContext';
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
import { PATH_API_HUB } from '@/constants/path-prefix';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { cn } from '@/lib/utils';
import type { ApiProductListItem } from '@/types/portal-sdk';

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

export type ApiHubPageProps = {
  data: ApiProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  search?: string;
  subscriptionStatus?: FilterParamProps['subscription_status'];
  basePath: string;
};

export default function ApiHubPage({
  data,
  total,
  page,
  pageSize,
  search,
  subscriptionStatus,
  basePath,
}: ApiHubPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const makeHref = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v === undefined) params.delete(k);
        else params.set(k, v);
      }
      return `${basePath}?${params.toString()}`;
    },
    [searchParams, basePath],
  );

  const navigate = (overrides: Record<string, string | undefined>) =>
    startTransition(() => router.push(makeHref(overrides)));

  const onParamsChange = (params: Partial<TableParams & FilterParamProps>) => {
    const overrides: Record<string, string | undefined> = { page: '1' };
    if ('search' in params)
      overrides.search = (params.search as string | undefined) || undefined;
    if ('page_size' in params)
      overrides.page_size = String(params.page_size);
    if ('subscription_status' in params)
      overrides.subscription_status = params.subscription_status || undefined;
    navigate(overrides);
  };

  return (
    <ApiHubBasePathContext.Provider value={basePath}>
    <div className={cn('flex flex-col gap-4 lg:flex-row', isPending && 'min-h-[50vh]')}>
      <Filter onParamsChange={onParamsChange} defaultFilter={subscriptionStatus} />
      <CardList<ApiProductListItem>
        CardItem={ProductCard}
        data={data}
        isLoading={false}
        isValidating={isPending}
        pagination={{
          total,
          page,
          pageSize,
          // CardList translates DataTablePagination's 0-based index to 1-based before
          // calling this. page=0 is the reset signal from onPageSizeChange; we ignore
          // it because onParamsChange already handles page_size + page=1 in one push.
          goToPage: (p) => { if (p > 0) navigate({ page: String(p) }); },
        }}
        reload={router.refresh}
        onParamsChange={onParamsChange}
        showSearch
        defaultSearch={search}
        searchPrefix={<OrgSelector />}
        skeletonCount={pageSize}
        className="card-container"
      />
    </div>
    </ApiHubBasePathContext.Provider>
  );
}
