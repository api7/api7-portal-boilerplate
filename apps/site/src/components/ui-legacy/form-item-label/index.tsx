'use client';

import type { AnyFieldApi } from '@tanstack/react-form';
import { PlusIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/helper/utils/tailwind';
import type { LabelParams } from '@/types/portal-sdk';
import type { FormLabel } from '@/types/utils';

export type FormItemLabelProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  name: string;
  fitWidth?: boolean;
} & LabelParams;

const FormItemLabel = (props: FormItemLabelProps) => {
  const { form, name, fitWidth } = props;

  return (
    <form.Field name={name} mode="array">
      {(labelsField: AnyFieldApi) => {
        const labels = (labelsField.state.value ?? []) as FormLabel;
        const allKeys = labels.map((l) => l.key);

        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              Labels{' '}
              <span className="text-muted-foreground text-xs">(Optional)</span>
            </label>

            {labels.map((_, i: number) => (
              <div key={i} className={cn('flex gap-2 mb-2', fitWidth && 'w-full')}>
                <form.Field
                  name={`${name}[${i}].key`}
                  validators={{
                    onChange: ({ value }: { value: string }) => {
                      if (!value) return 'Please enter key';
                      const otherKeys = allKeys.filter(
                        (_, j: number) => j !== i,
                      );
                      if (otherKeys.filter(Boolean).includes(value))
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
                      !value ? 'Please enter value' : undefined,
                  }}
                >
                  {(valueField: AnyFieldApi) => (
                    <div className="flex flex-col gap-1">
                      <Input
                        id={`${name}_${i}_value`}
                        placeholder="value"
                        value={valueField.state.value ?? ''}
                        onChange={(e) =>
                          valueField.handleChange(e.target.value)
                        }
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
};

export default FormItemLabel;
