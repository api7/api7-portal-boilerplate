import { map } from 'nanostores';

import { queryClient } from '@/lib/req';

export type GlobalState = {
  /** global pages */
  loading: boolean;
  authorized: boolean;
  /** auth req loading */
  authLoading: boolean;
  publicAccess: boolean;
};
export const $global = map<GlobalState>({
  loading: true,
  authorized: false,
  authLoading: true,
  publicAccess: false,
});

$global.subscribe((v, newV, changedKey) => {
  if (changedKey === 'authorized') {
    queryClient.clear();
  }
});
