import { API_CONFIG_STATUS } from '@/constants/api-prefix';
import { req } from '@/lib/req';
import { queryOptions } from '@tanstack/react-query';
import { type ConfigStatus } from 'app/api/config-status/route';

export const configStatusQueryOptions = queryOptions({
  queryKey: ['config-status'],
  queryFn: () =>
    req.get<ConfigStatus>(API_CONFIG_STATUS).then((res) => res.data),
});
