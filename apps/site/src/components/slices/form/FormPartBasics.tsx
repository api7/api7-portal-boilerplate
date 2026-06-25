'use client';

import { PlusIcon, Trash2Icon } from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { LabelParams } from '@/types/portal-sdk';
import type { FormLabel } from '@/types/utils';
import type { AnyFieldApi } from '@tanstack/react-form';

type FormItemLabelProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  name: string;
  fitWidth?: boolean;
} & LabelParams;

export type FormPartBasicsProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  labelProps: Omit<FormItemLabelProps, 'name' | 'form'>;
  hideLabel?: boolean;
};

const FieldError = ({ errors }: { errors: (string | undefined)[] }) => {
  const msg = errors.find(Boolean);
  if (!msg) return null;
  return (
    <p className="text-sm text-destructive mt-1" role="alert">
      {msg}
    </p>
  );
};

const FormItemLabel = ({ form, name, fitWidth }: FormItemLabelProps) => (
  <form.Field name={name} mode="array">
    {(labelsField: AnyFieldApi) => {
      const labels = (labelsField.state.value ?? []) as FormLabel;
      const allKeys = labels.map((l) => l.key);

      return (
        <div>
          <Label className="mb-2">
            Labels{' '}
            <span className="text-muted-foreground text-xs font-normal">
              (Optional)
            </span>
          </Label>

          {labels.map((_, i: number) => (
            <div
              key={i}
              className={cn('flex gap-2 mb-2', fitWidth && 'w-full')}
            >
              <form.Field
                name={`${name}[${i}].key`}
                validators={{
                  onChange: ({ value }: { value: string }) => {
                    const trimmed = value?.trim();
                    if (!trimmed) return 'Please enter key';
                    const otherKeys = allKeys.filter(
                      (_: unknown, j: number) => j !== i,
                    );
                    if (otherKeys.filter(Boolean).map((k) => k.trim()).includes(trimmed))
                      return 'Duplicate keys';
                    return undefined;
                  },
                }}
              >
                {(keyField: AnyFieldApi) => (
                  <div className="flex flex-col gap-1">
                    <Input
                      id={`${name}_${i}_key`}
                      placeholder="key"
                      value={keyField.state.value ?? ''}
                      onChange={(e) => keyField.handleChange(e.target.value)}
                      onBlur={keyField.handleBlur}
                      style={{ width: fitWidth ? '100%' : '140px' }}
                      aria-invalid={keyField.state.meta.errors.length > 0}
                    />
                    {keyField.state.meta.errors.length > 0 && (
                      <p className="text-xs text-destructive" role="alert">
                        {keyField.state.meta.errors.find(Boolean) as string}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <p className="leading-8">:</p>

              <form.Field
                name={`${name}[${i}].value`}
                validators={{
                  onChange: ({ value }: { value: string }) =>
                    !value?.trim() ? 'Please enter value' : undefined,
                }}
              >
                {(valueField: AnyFieldApi) => (
                  <div className="flex flex-col gap-1">
                    <Input
                      id={`${name}_${i}_value`}
                      placeholder="value"
                      value={valueField.state.value ?? ''}
                      onChange={(e) => valueField.handleChange(e.target.value)}
                      onBlur={valueField.handleBlur}
                      style={{ width: fitWidth ? '100%' : '140px' }}
                      aria-invalid={valueField.state.meta.errors.length > 0}
                    />
                    {valueField.state.meta.errors.length > 0 && (
                      <p className="text-xs text-destructive" role="alert">
                        {valueField.state.meta.errors.find(Boolean) as string}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => labelsField.removeValue(i)}
                data-testid={`delete-label-${i}`}
                className="border-none shadow-none ml-0.5"
              >
                <Trash2Icon aria-label="Delete label" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-fit"
            data-testid="add-label-btn"
            onClick={() =>
              labelsField.pushValue({ key: '', value: '' } as FormLabel[number])
            }
          >
            <PlusIcon />
            Add
          </Button>
        </div>
      );
    }}
  </form.Field>
);

const FormPartBasics = ({ form, labelProps, hideLabel = false }: FormPartBasicsProps) => (
  <div>
    <form.Field
      name="name"
      validators={{
        onChange: ({ value }: { value: string }) =>
          !value?.trim() ? 'Please enter Name' : undefined,
        onSubmit: ({ value }: { value: string }) =>
          !value?.trim() ? 'Please enter Name' : undefined,
      }}
    >
      {(field: AnyFieldApi) => (
        <div className="flex flex-col gap-1.5 mb-4">
          <label htmlFor="name" className="text-sm font-medium">
            Name{' '}
            <span className="text-muted-foreground text-xs">(Required)</span>
          </label>
          <Input
            id="name"
            value={field.state.value ?? ''}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            aria-invalid={field.state.meta.errors.length > 0}
          />
          <FieldError errors={field.state.meta.errors} />
        </div>
      )}
    </form.Field>

    <form.Field name="desc">
      {(field: AnyFieldApi) => (
        <div className="flex flex-col gap-1.5 mb-4">
          <label htmlFor="desc" className="text-sm font-medium">
            Description{' '}
            <span className="text-muted-foreground text-xs">(Optional)</span>
          </label>
          <Textarea
            id="desc"
            value={field.state.value ?? ''}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        </div>
      )}
    </form.Field>

    {!hideLabel && (
      <FormItemLabel form={form} name="labels" {...labelProps} />
    )}
  </div>
);

export default memo(FormPartBasics);
