'use client';

import { motion } from 'framer-motion';
import { debounce } from 'lodash-es';
import { XIcon } from 'lucide-react';

import Alert from '@/components/ui-legacy/alert';
import type { AlertProps } from '@/components/ui-legacy/alert';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';

const MotionDiv = motion.div;

export type DrawerProps = {
  children?: React.ReactNode;
  title: string;
  okText?: string;
  cancelText?: string;
  loading?: boolean;
  width?: string | number;
  okDebounceWait?: number;
  onOk?: () => void;
  showAlert?: boolean;
  alertProps?: AlertProps;
  customAlert?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  destroyOnHidden?: boolean;
  // extra props spread from UseDisclosureReturn
  onOpen?: () => void;
  onCancel?: () => void;
  setOpen?: () => void;
  setClose?: () => void;
};

const Drawer: React.FC<DrawerProps> = ({
  children,
  title,
  loading,
  cancelText = 'Cancel',
  okDebounceWait = 400,
  okText = 'Add',
  onOk,
  showAlert = false,
  customAlert,
  alertProps,
  open,
  onClose,
  // consumed but unused
  destroyOnHidden: _destroyOnHidden,
  onOpen: _onOpen,
  onCancel: _onCancel,
  setOpen: _setOpen,
  setClose: _setClose,
}) => {
  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose?.();
      }}
    >
      <SheetContent
        showCloseButton={false}
        className="data-[side=right]:sm:max-w-184 flex flex-col p-0 gap-0"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b px-6 py-4 gap-0">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Close drawer">
            <XIcon aria-hidden="true" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {showAlert &&
            (customAlert ||
              (alertProps && (
                <MotionDiv
                  className="mb-4"
                  animate={{ scale: [0, 1], y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert {...alertProps} />
                </MotionDiv>
              )))}
          {children}
        </div>

        <SheetFooter
          className="border-t px-6 py-4 flex-row justify-end"
          data-testid="drawer-footer"
        >
          <Button variant="secondary" size="lg" onClick={onClose}>
            {cancelText}
          </Button>
          {onOk && (
            <Button
              size="lg"
              disabled={!!loading}
              onClick={debounce(onOk, okDebounceWait)}
            >
              {loading && <Spinner data-icon="inline-start" />}
              {okText}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default Drawer;
