import { isNil, isEmpty } from 'lodash-es';

export const noNilEmpty = (...vals: unknown[]) =>
  vals.every((v) => !isNil(v) && !isEmpty(v));

export const noNilEmptyArray = (vals: unknown[] | undefined) => {
  if (isNil(vals) || isEmpty(vals)) {
    return false;
  }
  return vals.every((v) => !isNil(v) && !isEmpty(v));
};

export const someNoNilEmpty = (...vals: unknown[]) =>
  vals.some((v) => !isNil(v) && !isEmpty(v));

/**
 * shallow check and remove nil or empty value from array
 */
export const removeNilEmpty = <T>(arr: Nilable<T>[] | undefined) =>
  arr?.filter((v): v is T => noNilEmpty(v));

