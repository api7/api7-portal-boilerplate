import { ProForm, type ProFormProps } from '@ant-design/pro-components';

const Form = <T = Record<string, any>,>(
  props: ProFormProps<T> & {
    children?: React.ReactNode | React.ReactNode[];
  }
) => {
  return (
    <ProForm
      omitNil
      //FIXME: try see drawer and form's comments.
      // Doesn't work well with drawer's destroyOnHidden
      // clearOnDestroy
      // preserve={false}
      autoFocusFirstInput
      layout="vertical"
      requiredMark="optional"
      validateTrigger={['onChange', 'onFinish']}
      {...props}
    />
  );
};

export default Form;
