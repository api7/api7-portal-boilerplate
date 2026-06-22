'use client';

import { nanoid } from 'nanoid';
import { useEffect } from 'react';
import { toast } from 'sonner';

import Drawer from '@/components/base/drawer';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { transformFormLabelToAPI } from '@/helper/utils/form-producer/labels';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import type {
  BasicAuthCredential,
  BasicAuthPluginValue,
} from '@/types/portal-sdk';
import type { FormLabel } from '@/types/utils';
import { useForm } from '@tanstack/react-form';
import type {
  AnyFieldApi,
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from '@tanstack/react-form';

import { useApplicationId } from '../hook';

// Minimal form values required by FormItemBasicAuth (shared with RotateModal)
type BasicAuthSubFormValues = {
  basicAuth: { username: string; password: string };
};
type SubV = FormValidateOrFn<BasicAuthSubFormValues> | undefined;
type SubVA = FormAsyncValidateOrFn<BasicAuthSubFormValues> | undefined;
export type BasicAuthSubForm = ReactFormExtendedApi<
  BasicAuthSubFormValues,
  SubV,
  SubV,
  SubVA,
  SubV,
  SubVA,
  SubV,
  SubVA,
  SubV,
  SubVA,
  SubVA,
  unknown
>;

const FieldError = ({ errors }: { errors: (string | undefined)[] }) => {
  const msg = errors.find(Boolean);
  if (!msg) return null;
  return (
    <p className="text-sm text-destructive mt-1" role="alert">
      {msg}
    </p>
  );
};

export const FormItemBasicAuth = ({ form }: { form: BasicAuthSubForm }) => (
  <>
    <form.Field
      name="basicAuth.username"
      validators={{
        onChange: ({ value }: { value: string }) =>
          !value?.trim() ? 'Please enter Username' : undefined,
        onSubmit: ({ value }: { value: string }) =>
          !value?.trim() ? 'Please enter Username' : undefined,
      }}
    >
      {(field: AnyFieldApi) => (
        <div className="flex flex-col gap-1.5 mb-4">
          <label htmlFor="basic-auth_username" className="text-sm font-medium">
            Username{' '}
            <span className="text-muted-foreground text-xs">(Required)</span>
          </label>
          <Input
            id="basic-auth_username"
            placeholder="johndoe"
            value={field.state.value ?? ''}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            aria-invalid={field.state.meta.errors.length > 0}
          />
          <FieldError errors={field.state.meta.errors} />
        </div>
      )}
    </form.Field>

    <form.Field
      name="basicAuth.password"
      validators={{
        onChange: ({ value }: { value: string }) =>
          !value?.trim() ? 'Please enter Password' : undefined,
        onSubmit: ({ value }: { value: string }) =>
          !value?.trim() ? 'Please enter Password' : undefined,
      }}
    >
      {(field: AnyFieldApi) => (
        <div className="flex flex-col gap-1.5 mb-4">
          <label htmlFor="basic-auth_password" className="text-sm font-medium">
            Password{' '}
            <span className="text-muted-foreground text-xs">(Required)</span>
          </label>
          <p className="text-muted-foreground text-xs">
            Enter a custom password or click &apos;Generate&apos; to create a
            random one.
          </p>
          <div className="flex gap-2">
            <Input
              id="basic-auth_password"
              type="password"
              value={field.state.value ?? ''}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="w-24"
              onClick={() => field.handleChange(nanoid())}
            >
              Generate
            </Button>
          </div>
          <FieldError errors={field.state.meta.errors} />
        </div>
      )}
    </form.Field>
  </>
);

type BasicAuthAddDrawerProps = UseDisclosureReturn & {
  // Surfaces the username/password once, right after creation. The password is
  // never returned again on read paths, so the table reveals it via a one-time
  // alert.
  setAlertData?: (data: BasicAuthPluginValue) => void;
};

const BasicAuthAddDrawer = (props: BasicAuthAddDrawerProps) => {
  const { open, onClose, onOk, setAlertData, ...rest } = props;
  const applicationId = useApplicationId();

  const form = useForm({
    defaultValues: {
      name: '',
      desc: '',
      labels: [] as FormLabel,
      basicAuth: { username: '', password: '' },
    },
    onSubmit: async ({ value }) => {
      const payload: Parameters<
        typeof portalClient.application.credential.create
      >[1] = {
        name: value.name,
        desc: value.desc || undefined,
        labels: transformFormLabelToAPI(value.labels),
        type: 'basic-auth',
        'basic-auth': {
          username: value.basicAuth.username,
          password: value.basicAuth.password,
        },
      };
      const res = (await portalClient.application.credential.create(
        applicationId,
        payload,
      )) as BasicAuthCredential;
      setAlertData?.(res['basic-auth'] as BasicAuthPluginValue);
      onOk?.();
      toast.success('Add Basic Authentication Credential Successfully');
      onClose();
    },
  });

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  return (
    <Drawer
      title="Add Basic Authentication Credential"
      open={open}
      onClose={onClose}
      onOk={() => form.handleSubmit()}
      loading={form.state.isSubmitting}
      {...rest}
    >
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <FormPartBasics
          form={form}
          labelProps={{ resourceType: 'developer_credential' }}
        />
        <FormItemBasicAuth form={form as unknown as BasicAuthSubForm} />
      </form>
    </Drawer>
  );
};

export default BasicAuthAddDrawer;
