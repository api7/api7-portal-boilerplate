import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useBoolean, useDeepCompareEffect } from 'ahooks';

import { useParams } from '../hooks/useParams';
import { useSavePage } from '../hooks/useSavePage';
import { useOrganizationSlug } from '../hooks/useOrganizationSlug';
import { portalClient } from '../portal-sdk/client';
import type { WithSavePage } from '@/types/utils';

type Params = TableParams & {
  auth_method?: 'key-auth' | 'basic-auth' | 'oauth';
  application_id?: string[];
};

export type CredentialParams = Params;

export type CredentialListParams = WithSavePage & {
  enabled?: boolean;
  fetchAll?: boolean;
  initParams?: Params;
};

export type UseCredentialListReturnType = ReturnType<typeof useCredentialList>;
export const useCredentialList = (params: CredentialListParams) => {
  const orgSlug = useOrganizationSlug();
  const {
    savePage = true,
    enabled = true,
    fetchAll = false,
    initParams = {} as Params,
  } = params || ({} as CredentialListParams);
  const { paramsOnlyStr, paramsKeepNum, updateParams } = useParams(
    fetchAll
      ? { ...initParams, page: undefined, page_size: undefined }
      : initParams
  );
  const { onParamsChange } = useSavePage<TableParams>({
    savePage,
    updateParams,
  });
  // handle async paramsOnlyStr
  // to ensure the enabled state is updated when the applications change
  const [localEnabled, localEnabledOp] = useBoolean(true);
  useDeepCompareEffect(() => {
    if (!initParams.application_id?.length) {
      return localEnabledOp.setFalse();
    }
    if (!paramsOnlyStr.application_id?.length) {
      return localEnabledOp.setFalse();
    }
    localEnabledOp.setTrue();
  }, [paramsOnlyStr.application_id, initParams.application_id]);
  const goToPage = (page: number) =>
    onParamsChange({ page: page < 1 ? 1 : page });
  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['portal', 'org', orgSlug, 'application', paramsOnlyStr.application_id, 'credentials', paramsOnlyStr],
    placeholderData: keepPreviousData,
    queryFn: () => portalClient.credential.list(paramsOnlyStr),
    enabled: enabled && localEnabled,
  });

  return {
    data: data?.list,
    pagination: {
      total: data?.total || 0,
      page: paramsKeepNum.page!,
      pageSize: paramsKeepNum.page_size!,
      pageIndex: paramsKeepNum.page! - 1,
      goToPage,
    },
    isLoading,
    isError,
    isValidating: isFetching,
    refetch,
    onParamsChange,
    paramsOnlyStr,
  };
};

export default useCredentialList;
