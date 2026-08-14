import { useBoolean } from 'ahooks';

export type UseDisclosureProps = {
  defaultOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onOk?: () => void;
  onCancel?: () => void;
};
export type UseDisclosureReturn = ReturnType<typeof useDisclosure>;

const setNCall = (setter: () => void, fn?: () => void) => () => {
  setter();
  fn?.();
};

const useDisclosure = (props: UseDisclosureProps = {}) => {
  const { defaultOpen, onOpen, onClose } = props;
  const [open, openOp] = useBoolean(defaultOpen);
  return {
    open,
    onOpen: setNCall(openOp.setTrue, onOpen),
    onClose: setNCall(openOp.setFalse, onClose),
    onOk: setNCall(openOp.setFalse, props.onOk),
    onCancel: setNCall(openOp.setFalse, props.onCancel),
    setOpen: openOp.setTrue,
    setClose: openOp.setFalse,
  };
};
export default useDisclosure;

