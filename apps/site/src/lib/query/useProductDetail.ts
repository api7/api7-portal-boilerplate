import { useQuery } from '@tanstack/react-query';

import { portalClient } from '../portal-sdk/client';

function useProductDetail(id?: string) {
  const { data, refetch, isFetching, isLoading, isError, status } = useQuery({
    queryKey: ['product', id],
    queryFn: () => portalClient.apiProduct.get(id!),
    enabled: !!id,
    retry: false, // disable automatic retries, to speed up no authorized users
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
