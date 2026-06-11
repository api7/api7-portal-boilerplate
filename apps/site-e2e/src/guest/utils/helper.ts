import {
  PATH_ROOT,
  PATH_API_HUB,
} from '@site/constants/path-prefix';

export const genCanViewPages = () =>
  [PATH_ROOT, PATH_API_HUB] as const;
export const genNotFoundPages = () =>
  [
    '/any_not_exist_page',
  ] as const;
