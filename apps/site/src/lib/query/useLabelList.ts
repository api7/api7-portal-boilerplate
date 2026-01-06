import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useCreation, useDeepCompareEffect } from 'ahooks';
import type { ColumnFilterItem } from 'antd/es/table/interface';

import { portalClient } from '@/lib/portal-sdk/client';
import type { TreeOptionProps } from '@/components/ui/form-item-label/LabelDropDown';
import { LabelParams } from '@/types/portal-sdk';

type LabelFetcherParams = TableParams & LabelParams;

export const computedLabelLength = (data: TreeOptionProps): number => {
  let totalLength = 0;

  Object.keys(data).forEach((key) => {
    const value = data[key].filter((v) => v.isCheck);
    totalLength += value.length;
  });
  return totalLength;
};

export type UseLabelListReturn = ReturnType<typeof useLabelList>;

const useLabelList = (params: LabelFetcherParams) => {
  const { data, refetch, isFetching, isLoading, isError } = useQuery({
    queryKey: ['product', params],
    queryFn: () => portalClient.misc.listLabels(params.resourceType),
    enabled: !!params.resourceType,
  });

  const labelList = useCreation(
    () =>
      Object.keys(data || {}).map((item) => ({
        text: item,
        value: item,
        children: data?.[item]?.map((childItem: string) => ({
          text: childItem,
          value: childItem,
        })),
      })) as ColumnFilterItem[],
    [data]
  );

  const treeOptions: TreeOptionProps = useCreation(
    () =>
      labelList.reduce((acc, cur) => {
        // `lodash.set` can't be used here.
        // `lodash.set` should not be used when the key is uncontrollable.
        // Because key `cur.value` may be data like 'a.b', and `lodash.set` will treat 'a.b' as a JSON Path, resulting in the final value being obj = { a: { b: [] } }
        acc[String(cur.value)] =
          cur.children?.map((item) => ({
            label: item.text,
            value: String(item.value),
            isCheck: false,
          })) || [];
        return acc;
      }, {} as TreeOptionProps),
    [labelList]
  );

  const [checkList, setCheckList] = useState<TreeOptionProps>(treeOptions);
  useDeepCompareEffect(() => setCheckList(treeOptions), [treeOptions]);

  const selectedValue = useMemo(
    () =>
      Object.keys(checkList || {})
        .map((item) => {
          const children = checkList[item].filter((v) => v.isCheck);
          return children.map((v) => ({
            label: `${item}:${v.label}`,
            value: {
              key: item,
              value: v.value,
            },
          }));
        })
        .flatMap((x) => x),
    [checkList]
  );

  const resetCheckList = () => setCheckList(treeOptions);

  type RequestParams = Record<string, string[]>;
  const requestParams: RequestParams = useCreation(
    () =>
      Object.keys(checkList).reduce((acc, cur) => {
        const children = checkList[cur]
          .filter((v) => v.isCheck)
          .map((v) => v.value);
        acc[`labels[${cur}]`] = children;
        return acc;
      }, {} as RequestParams),
    [checkList]
  );

  const selectedLabelLength = computedLabelLength(checkList);
  return {
    data,
    labelList,
    checkList,
    setCheckList,
    resetCheckList,
    requestParams,
    selectedValue,
    selectedLabelLength,
    isLoading,
    isValidating: isFetching,
    isError,
    refetch,
  };
};

export default useLabelList;

