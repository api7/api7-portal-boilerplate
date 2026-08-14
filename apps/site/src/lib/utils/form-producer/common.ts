import { clean } from 'fast-clean';

export const deepCleanEmptyKeys = <T extends object>(
  obj: T,
  opts?: PannerOptions
) =>
  clean(obj, {
    nullCleaner: true,
    ...opts,
  });
