import { useQuery } from '@tanstack/react-query';

import { useOrganizationSlug } from '../hooks/useOrganizationSlug';
import { portalClient } from '../portal-sdk/client';
import { productDetailKey } from '@/lib/query/keys';

function useProductDetail(id?: string) {
  const orgSlug = useOrganizationSlug();
  const queryKey = productDetailKey(orgSlug, id);
  const { data, refetch, isFetching, isLoading, isError, status } = useQuery({
    queryKey,
    queryFn: () => portalClient.apiProduct.get(id!),
    enabled: !!id,
    retry: false,
  });

  return {
    isLoading,
    isValidating: isFetching,
    refetch,
    data,
    isError,
    status,
  };
}

export type UseProductDetailReturn = ReturnType<typeof useProductDetail>;

export default useProductDetail;
