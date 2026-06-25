import { clean } from 'fast-clean';
import { produce } from 'immer';
import { isArray, isObject, set, unset } from 'lodash-es';
import { flow as pipe } from 'lodash-es';

export const deepCleanEmptyKeys = <T extends object>(
  obj: T,
  opts?: PannerOptions
) =>
  clean(obj, {
    nullCleaner: true,
    ...opts,
  });

/**
 * this will change the object in place
 */
export const rmDoubleUnderscoreKeys = (obj: object) => {
  Object.keys(obj).forEach((key) => {
    if ((key as string).startsWith('__')) return unset(obj, key);
    const val = obj[key as keyof typeof obj];
    if (isObject(val) && !isArray(val)) {
      set(obj, key, rmDoubleUnderscoreKeys(val));
    }
  });
  return obj;
};

export const pipeProduce = <T extends object>(
  ...func: Parameters<typeof pipe>
) =>
  produce<(draft: T) => T>((draft: T) =>
    pipe(...func, rmDoubleUnderscoreKeys, deepCleanEmptyKeys)(draft)
  );

