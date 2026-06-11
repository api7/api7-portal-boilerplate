'use client';

import { memo } from 'react';

import type { AnyFieldApi } from '@tanstack/react-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormItemBox, { type FormItemBoxProps } from './FormItemBox';
import FormItemLabel from '@/components/ui-legacy/form-item-label';
import type { FormItemLabelProps } from '@/components/ui-legacy/form-item-label';

export type FormPartBasicsProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  labelProps: Omit<FormItemLabelProps, 'name' | 'form'>;
  hideLabel?: boolean;
} & RenameField<FormItemBoxProps, 'label', 'title'>;

const FieldError = ({ errors }: { errors: (string | undefined)[] }) => {
  const msg = errors.find(Boolean);
  if (!msg) return null;
  return (
    <p className="text-sm text-destructive mt-1" role="alert">
      {msg}
    </p>
  );
};

const FormPartBasics = (props: FormPartBasicsProps) => {
  const { form, labelProps, hideLabel = false, title, ...formItemBoxProps } = props;

  return (
    <FormItemBox isChunk label={title} {...formItemBoxProps}>
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

      {!hideLabel && <FormItemLabel form={form} name="labels" {...labelProps} />}
    </FormItemBox>
  );
};

export default memo(FormPartBasics);
