import { useState } from 'react';

import { Image } from '@chakra-ui/react';
import { useCreation, useDeepCompareEffect, useMemoizedFn } from 'ahooks';
import type { ColumnType } from 'antd/es/table';

import A7LabelList from '@/components/api7/api7-label-list';
import LabelDropDown, {
  type LabelDropDownProps,
  type TreeOptionProps,
  type TreeOptionValArr,
} from '@/components/ui-legacy/form-item-label/LabelDropDown';
import type { UseLabelListReturn } from '@/lib/query/useLabelList';

type FilterRelated = Pick<
  UseLabelListReturn,
  'checkList' | 'setCheckList' | 'requestParams'
> &
  Pick<LabelDropDownProps, 'hideKey'> & {
    onParamsChange: (params: any) => void;
    checkedLen: number;
    requestDataIndex?: string;
  };

export const tableColWithFilter = <T,>(
  param: Partial<ColumnType<T>> & FilterRelated
): ColumnType<T> => {
  const {
    requestParams,
    checkList,
    setCheckList,
    onParamsChange,
    checkedLen,
    hideKey = false,
    ...rest
  } = param;
  return {
    filterIcon: () => (
      <Image
        className="text-primary-content"
        src={checkedLen ? '/icons/filter-fill.svg' : '/icons/filter-line.svg'}
        width="16px"
        height="full"
        alt="filter icon"
      />
    ),
    filterDropdownProps: {
      onOpenChange: (open) => {
        if (!open) onParamsChange(requestParams);
      },
    },
    filterDropdown: () => (
      <LabelDropDown
        hideKey={hideKey}
        value={checkList}
        onChange={setCheckList}
      />
    ),
    render: (data) => (
      <A7LabelList
        color="blue"
        limitCount={3}
        data={Object.keys(data || {}).map((item) =>
          hideKey ? data?.[item] : `${item as string}:${data?.[item]}`
        )}
      />
    ),
    ...rest,
  };
};

export const tableColLabels = <T,>(
  param: Partial<ColumnType<T>> &
    Omit<FilterRelated, 'checkedLen'> &
    Pick<UseLabelListReturn, 'selectedLabelLength' | 'labelList'>
): ColumnType<T> =>
  tableColWithFilter({
    ...param,
    filters: param.labelList,
    checkedLen: param.selectedLabelLength,
  });

export const useTableColWithFilterOption = <T,>(
  param: ColumnType<T> &
    Omit<
      FilterRelated,
      'requestParams' | 'checkList' | 'setCheckList' | 'checkedLen'
    > & { filterField?: string }
): ColumnType<T> => {
  const { filters, dataIndex, requestDataIndex = dataIndex } = param;
  // process check list i18n
  const genI18nCheckList = useMemoizedFn(
    (oldCheckList?: Record<string, TreeOptionValArr>) =>
      ({
        '': filters?.map((v) => ({
          ...v,
          label: v.text,
          isCheck:
            oldCheckList?.['']?.find((c) => c.value === v.value)?.isCheck ??
            false,
        })),
      } as TreeOptionProps)
  );

  const [checkList, setCheckList] = useState<TreeOptionProps>(genI18nCheckList);
  const checkedList = useCreation(
    () => checkList[''].filter((v) => v.isCheck),
    [checkList]
  );
  const requestParams = useCreation(() => {
    const checkedValues = checkedList.map((v) => v.value);
    return { [requestDataIndex as string]: checkedValues };
  }, [checkedList, dataIndex]);

  // update check list when filters change(i18n)
  useDeepCompareEffect(() => setCheckList(genI18nCheckList), [filters]);

  return tableColWithFilter({
    requestParams,
    checkList,
    setCheckList,
    checkedLen: checkedList.length,
    ...param,
  });
};

