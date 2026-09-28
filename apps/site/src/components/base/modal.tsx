import { Alert, type AlertProps } from '@/components/base/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ModalProps = {
  children?: React.ReactNode;
  open?: boolean;
  title?: string;
  /** Extra classes for the dialog content (e.g. to widen it). */
  className?: string;
  /** Override the OK button label (defaults to Confirm for danger, Save otherwise). */
  okText?: string;

  okButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  cancelButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;

  onOk?: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onCancel?: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  afterClose?: () => void;

  okType?: 'default' | 'danger';
  alertProps?: AlertProps;
};

const Modal = (props: ModalProps) => {
  const {
    children,
    open,
    title,
    className,
    okText,
    okButtonProps,
    cancelButtonProps,
    onOk,
    onCancel,
    afterClose,
    okType,
    alertProps,
  } = props;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          onCancel?.();
          afterClose?.();
        }
      }}
    >
      <DialogContent className={cn('sm:max-w-xl', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {alertProps && <Alert {...alertProps} />}
        {children}
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" {...cancelButtonProps}>
                Cancel
              </Button>
            }
          />
          <Button
            type="button"
            variant={okType === 'danger' ? 'destructive' : 'default'}
            onClick={() => onOk?.()}
            {...okButtonProps}
          >
            {okText ?? (okType === 'danger' ? 'Confirm' : 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
