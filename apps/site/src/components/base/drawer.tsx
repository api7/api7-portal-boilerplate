'use client';

import { motion } from 'framer-motion';
import { debounce } from 'lodash-es';
import { XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';


import { Alert, type AlertProps } from '@/components/base/alert';
import { Button } from '@api7/portal-ui/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@api7/portal-ui/components/ui/sheet';
import { Spinner } from '@api7/portal-ui/components/ui/spinner';

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
  // Debounced wrapper must stay the same function identity across renders
  // (recreating it would reset the pending debounce timer), so it can't
  // close over `onOk` directly — a ref keeps it reading the latest value.
  const onOkRef = useRef(onOk);
  useEffect(() => {
    onOkRef.current = onOk;
  });

  const debouncedOk = useMemo(
    () =>
      debounce(
        // Deferred by lodash's debounce, this never actually runs during render.
        // eslint-disable-next-line react-hooks/refs
        () => onOkRef.current?.(),
        okDebounceWait,
      ),
    [okDebounceWait],
  );

  useEffect(() => {
    if (!open) debouncedOk.cancel();
  }, [open, debouncedOk]);

  useEffect(() => () => debouncedOk.cancel(), [debouncedOk]);

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
              onClick={debouncedOk}
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
