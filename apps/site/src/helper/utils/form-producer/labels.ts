import { produce } from 'immer';
import { isNil, isEmpty, set, unset } from 'lodash-es';

import type {
  APIFormLabel,
  FormLabel,
  ToAPILabel,
  ToFormLabel,
} from '@/types/utils';

export const transformFormLabelToAPI = (label?: FormLabel): APIFormLabel => {
  const returnData: { [x: string]: string } = {};
  if (!label) return returnData;

  label?.forEach((item) => {
    returnData[item.key] = item.value;
  });

  return returnData;
};

export const transformAPILabelToForm = (label?: APIFormLabel): FormLabel => {
  const returnData: FormLabel = [];
  if (!label) return returnData;

  Object.keys(label).forEach((key) => {
    returnData.push({
      key: key as string,
      value: label[key],
    });
  });

  return returnData;
};

export const produceToAPILabels = produce((draft) => {
  if (!isNil(draft.labels) && !isEmpty(draft.labels)) {
    set(draft, 'labels', transformFormLabelToAPI(draft?.labels));
  } else {
    unset(draft, 'labels');
  }
}) as (draft: ToFormLabel<object>) => ToAPILabel<object>;

export const produceToFormLabels = produce((draft) => {
  if (!isNil(draft.labels) && !isEmpty(draft.labels)) {
    set(draft, 'labels', transformAPILabelToForm(draft?.labels));
  } else {
    unset(draft, 'labels');
  }
}) as (draft: ToAPILabel<object>) => ToFormLabel<object>;

