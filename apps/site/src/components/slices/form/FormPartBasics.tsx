import { memo } from 'react';

import { ProFormText, ProFormTextArea } from '@ant-design/pro-components';

import FormItemBox, { type FormItemBoxProps } from './FormItemBox';
import FormItemLabel, {
  type FormItemLabelProps,
} from '@/components/ui/form-item-label';
import { useNamePrefix } from '@/lib/hooks/useNamePrefix';

export type FormPartBasicsProps = {
  labelProps: Omit<FormItemLabelProps, 'name' | 'children'>;
  hideLabel?: boolean;
} & RenameField<FormItemBoxProps, 'label', 'title'>;

const FormPartBasics = (props: FormPartBasicsProps) => {
  const { labelProps, hideLabel = false, title, ...formItemBoxProps } = props;
  const np = useNamePrefix();

  return (
    <FormItemBox isChunk label={title} {...formItemBoxProps}>
      <ProFormText
        label="Name"
        name={np('name')}
        placeholder=""
        rules={[{ required: true }]}
      />

      <ProFormTextArea label="Description" name={np('desc')} placeholder="" />

      {!hideLabel && (
        <FormItemLabel
          {...{ name: np('labels') }}
          {...(labelProps as FormItemLabelProps)}
        />
      )}
    </FormItemBox>
  );
};

export default memo(FormPartBasics);
