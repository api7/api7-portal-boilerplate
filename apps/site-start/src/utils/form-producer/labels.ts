import type { APIFormLabel, FormLabel } from '@/types/utils';

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

