import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, ChevronLeft, ChevronRight, Info, Search } from 'lucide-react';
import MainLayout from '@/components/layouts/MainLayout';
import ImpersonateOwnerButton from '@/components/dashboard/ImpersonateOwnerButton';
import Header from '@/components/ui-legacy/header';
import { Button } from '@/components/ui/button';
import { isImpersonatingSession } from '@/lib/auth/admin';
import { isPlatformAdmin } from '@/lib/auth/admin.server';
import { listAdminOrganizations } from '@/lib/dal/admin-organization';
import { verifySession } from '@/lib/dal/util';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePositiveInteger,
} from '@/lib/api/admin';
import { PATH_ROOT } from '@/constants/path-prefix';

export const dynamic = 'force-dynamic';

type DashboardOrganizationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getStringParam = (
  value: string | string[] | undefined
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function DashboardOrganizationsPage({
  searchParams,
}: DashboardOrganizationsPageProps) {
  const session = await verifySession({ redirect: true });

  if (
    !session?.user ||
    !isPlatformAdmin(session.user.id) ||
    isImpersonatingSession(session.session.impersonatedBy)
  ) {
    redirect(PATH_ROOT);
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  let page = DEFAULT_PAGE;
  let pageSize = DEFAULT_PAGE_SIZE;
  try {
    page = parsePositiveInteger(
      getStringParam(resolvedSearchParams.page) ?? null,
      DEFAULT_PAGE,
      'page'
    );
    pageSize = Math.min(
      parsePositiveInteger(
        getStringParam(resolvedSearchParams.page_size) ?? null,
        DEFAULT_PAGE_SIZE,
        'page_size'
      ),
      MAX_PAGE_SIZE
    );
  } catch {
    page = DEFAULT_PAGE;
    pageSize = DEFAULT_PAGE_SIZE;
  }
  const search = getStringParam(resolvedSearchParams.search)?.trim() || undefined;

  const result = await listAdminOrganizations({
    page,
    pageSize,
    search,
    orderBy: 'created_at',
    direction: 'desc',
  });

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const makePageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (search) {
      params.set('search', search);
    }
    params.set('page', String(targetPage));
    params.set('page_size', String(pageSize));
    return `/dashboard/organizations?${params.toString()}`;
  };

  return (
    <MainLayout>
      <div className="card-container">
        <Header
          title="Organization Dashboard"
          afterTitle={<Building2 className="h-5 w-5" />}
          desc="Inspect organizations and enter impersonation mode as the organization owner."
          className="mb-6"
        />

        <form className="mb-4 flex items-center gap-3" action="/dashboard/organizations">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by organization name or slug"
              className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-base-100 focus:ring-1 focus:ring-base-100"
            />
          </div>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="page_size" value={String(pageSize)} />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>

        <div className="overflow-hidden rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Applications</th>
                <th className="px-4 py-3">
                  <span className="group relative inline-flex items-center gap-1">
                    Owner
                    <Info className="h-3.5 w-3.5 text-gray-400" />
                    <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-normal normal-case tracking-normal text-gray-600 shadow-md group-hover:block">
                      The earliest-joined member with the <strong>owner</strong> role. Banned users are excluded.
                    </span>
                  </span>
                </th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-sm">
              {result.list.length ? (
                result.list.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                        {item.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.application_count}</td>
                    <td className="px-4 py-3">
                      {item.owner ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-900">{item.owner.name || '—'}</span>
                          <span className="text-xs text-gray-500">{item.owner.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No owner found</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.owner ? (
                        <ImpersonateOwnerButton userId={item.owner.user_id} />
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Impersonate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-12 text-center text-gray-400" colSpan={5}>
                    No organizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {page} of {totalPages}
            <span className="mx-1">·</span>
            {result.total} organization{result.total !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            {page > 1 ? (
              <Button variant="outline" size="xs" asChild>
                <Link href={makePageHref(page - 1)}>
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="xs" disabled>
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button variant="outline" size="xs" asChild>
                <Link href={makePageHref(page + 1)}>
                  Next
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="xs" disabled>
                Next
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
