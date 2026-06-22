'use client';

import { useBoolean } from 'ahooks';
import { useEffect } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';

import { useForm, useStore } from '@tanstack/react-form';
import type { AnyFieldApi } from '@tanstack/react-form';

import { type AlertProps } from '@/components/base/alert';
import Modal, { type ModalProps } from '@/components/base/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { useClipboard } from '@chakra-ui/react';

type Props = ModalProps &
  UseDisclosureReturn & {
    confirmText: string;
    targetText: string;
    alertProps?: AlertProps;
  };

const ValidateModal = (props: Props) => {
  const { confirmText, targetText, alertProps, ...rest } = props;
  const [okDisabled, okDisabledOp] = useBoolean(true);
  const clipboard = useClipboard(confirmText);

  const form = useForm({
    defaultValues: { inputText: '' },
    onSubmit: async () => {},
  });

  const inputText = useStore(form.store, (s) => s.values.inputText);

  useEffect(() => {
    if (rest.open) {
      okDisabledOp.setTrue();
      form.reset();
    }
  }, [rest.open, form, okDisabledOp]);

  useEffect(() => {
    if (confirmText && inputText !== undefined) {
      okDisabledOp.set(inputText.trim() !== confirmText.trim());
    }
  }, [inputText, confirmText, okDisabledOp]);

  return (
    <Modal
      okButtonProps={{
        disabled: okDisabled,
        className:
          'rounded-md disabled:!text-white disabled:!bg-red-500 disabled:opacity-40',
      }}
      {...rest}
      afterClose={() => {
        rest.afterClose?.();
        okDisabledOp.setTrue();
      }}
      alertProps={{
        variant: 'destructive',
        ...alertProps,
      }}
    >
      <div>
        <p className="mb-2! text-base text-foreground">
          Enter {targetText}{' '}
          <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5">
            <strong className="min-w-0 break-all font-bold!">
              {confirmText}
            </strong>
            <Tooltip>
              <TooltipTrigger
                delay={0}
                render={
                  <Button
                    className="h-4 inline-flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
                    aria-label={
                      clipboard.hasCopied ? 'Copied' : 'Copy to clipboard'
                    }
                    variant="ghost"
                    onClick={() => clipboard.onCopy()}
                  >
                    {clipboard.hasCopied ? (
                      <CheckIcon className="text-green-500" />
                    ) : (
                      <CopyIcon />
                    )}
                  </Button>
                }
              />
              <TooltipContent>
                <p>{clipboard.hasCopied ? 'Copied' : 'Copy to clipboard'}</p>
              </TooltipContent>
            </Tooltip>
          </span>{' '}
          to confirm.
        </p>
        <form.Field name="inputText">
          {(field: AnyFieldApi) => (
            <Input
              id="inputText"
              placeholder={confirmText}
              value={field.state.value ?? ''}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="border-red-500 shadow-red-500 shadow-[0_0_0_1px]"
            />
          )}
        </form.Field>
      </div>
    </Modal>
  );
};

export default ValidateModal;
