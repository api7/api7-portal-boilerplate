'use client';

import { useRef, useState } from 'react';

import { useDeepCompareEffect, useMemoizedFn, useReactive } from 'ahooks';
import { isEqual, isNumber, isString, mapValues } from 'lodash-es';

import { deepCleanEmptyKeys } from '../utils/form-producer/common';

type NumToStr<T> = {
  [K in keyof T]: T[K] extends number ? string : T[K];
};

const getParamsKeepNum = <T extends TableParams>(params: T) => {
  const paramsKeepNum = mapValues(params, (v) => {
    if (isString(v) && !isNaN(+v)) return +v;
    return v;
  }) as T;
  return deepCleanEmptyKeys(paramsKeepNum);
};

const getParamsHash = <T extends TableParams>(params: T) => {
  return JSON.stringify(getParamsKeepNum(params));
};

/**
 * only solve one level of object
 */
const useParams = <T extends TableParams>(params: T) => {
  const paramsPassed = useRef(params);
  const [paramsHash, setParamsHash] = useState(getParamsHash(params));
  const r = useReactive({
    params,
    get paramsOnlyStr() {
      const params = mapValues(this.params, (v) => {
        if (isNumber(v)) return v.toString();
        return v;
      }) as NumToStr<T>;
      return deepCleanEmptyKeys(params);
    },
    get paramsKeepNum() {
      return getParamsKeepNum(this.params);
    },
  });

  // Update r.params when mergedParams changes
  // eslint-disable-next-line react-hooks/immutability
  useDeepCompareEffect(() => {
    if (isEqual(params, paramsPassed.current)) return;
    paramsPassed.current = params;
    const newParams = deepCleanEmptyKeys(params) as T;
    // eslint-disable-next-line react-hooks/immutability
    r.params = newParams;
    setParamsHash(getParamsHash(newParams));
  }, [params]);

  const updateParams = useMemoizedFn((params: Partial<T>) => {
    const newParams = deepCleanEmptyKeys({ ...r.params, ...params }) as T;
    // eslint-disable-next-line react-hooks/immutability
    r.params = newParams;
    setParamsHash(getParamsHash(newParams));
    return r.params;
  });

  return {
    paramsOnlyStr: r.paramsOnlyStr,
    paramsKeepNum: r.paramsKeepNum,
    updateParams,
    paramsHash,
  };
};

export { useParams };
