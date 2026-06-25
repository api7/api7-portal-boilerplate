'use client';

import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { Alert } from '@/components/base/alert';
import Drawer from '@/components/base/drawer';
import FormPartBasics from '@/components/slices/form/FormPartBasics';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import type { KeyAuthCredential, KeyAuthPluginValue } from '@/types/portal-sdk';
import type { FormLabel } from '@/types/utils';
import { transformFormLabelToAPI } from '@/utils/form-producer/labels';
import { useApplicationId } from '../hook';

export const FormItemKey = ({
  children,
  required = true,
}: {
  children?: React.ReactNode;
  required?: boolean;
}) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className="text-sm font-medium">
      Key{' '}
      {required && (
        <span className="text-muted-foreground text-xs">(Required)</span>
      )}
    </label>
    {children ?? (
      <Alert
        variant="info"
        description="A random key will be automatically generated. You cannot specify a custom key value."
      />
    )}
  </div>
);

type KeyAuthAddDrawerProps = UseDisclosureReturn & {
  // Surfaces the generated key once, right after creation. The key is never
  // returned again on read paths, so the table reveals it via a one-time alert.
  setAlertData?: (key: string) => void;
};

const KeyAuthAddDrawer = (props: KeyAuthAddDrawerProps) => {
  const { open, onClose, onOk, setAlertData, ...rest } = props;
  const applicationId = useApplicationId();

  const form = useForm({
    defaultValues: {
      name: '',
      desc: '',
      labels: [] as FormLabel,
    },
    onSubmit: async ({ value }) => {
      const payload: Parameters<
        typeof portalClient.application.credential.create
      >[1] = {
        name: value.name,
        desc: value.desc || undefined,
        labels: transformFormLabelToAPI(value.labels),
        type: 'key-auth',
        'key-auth': {},
      };
      const res = (await portalClient.application.credential.create(
        applicationId,
        payload,
      )) as KeyAuthCredential;
      const key = (res['key-auth'] as KeyAuthPluginValue | undefined)?.key;
      if (!key) {
        toast.error(
          'Credential created, but no key was returned. Please regenerate to get a new key.',
        );
        onClose();
        return;
      }
      setAlertData?.(key);
      onOk?.();
      toast.success('Add Key Authentication Credential Successfully');
      onClose();
    },
  });

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  return (
    <Drawer
      title="Add Key Authentication Credential"
      open={open}
      onClose={onClose}
      onOk={() => form.handleSubmit()}
      loading={form.state.isSubmitting}
      {...rest}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FormPartBasics
          form={form}
          labelProps={{ resourceType: 'developer_credential' }}
        />
        <FormItemKey />
      </form>
    </Drawer>
  );
};

export default KeyAuthAddDrawer;
