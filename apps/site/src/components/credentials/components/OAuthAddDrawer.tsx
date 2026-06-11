'use client';

import { useEffect } from 'react';

import { useForm } from '@tanstack/react-form';
import type {
  AnyFieldApi,
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from '@tanstack/react-form';
import { omit } from 'lodash-es';
import { TrashIcon } from 'lucide-react';
import { toast } from 'sonner';

import Form from '@/components/slices/form/Form';
import Drawer from '@/components/base/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { transformRedirectURIsToAPI } from '@/helper/utils/form-producer/redirect_uris';
import { cn } from '@/helper/utils/tailwind';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import { portalClient } from '@/lib/portal-sdk/client';
import useDCRProviderList from '@/lib/query/useDCRProviderList';
import type {
  OAuthCredential,
  OAuthCredentialBasics,
} from '@/types/portal-sdk';

import { useApplicationId } from '../hook';

type OAuthFormValues = {
  dcr_provider_id: string;
  redirect_uris: { redirect_url: string }[];
  desc: string;
};

type V = FormValidateOrFn<OAuthFormValues> | undefined;
type VA = FormAsyncValidateOrFn<OAuthFormValues> | undefined;

type OAuthForm = ReactFormExtendedApi<
  OAuthFormValues,
  V, V, VA, V, VA, V, VA, V, VA, VA, unknown
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

export const FormItemOAuth = ({
  form,
  isEdit = false,
}: {
  form: OAuthForm;
  isEdit?: boolean;
}) => {
  const { data } = useDCRProviderList({ fetchAll: true });

  return (
    <>
      <form.Field
        name="dcr_provider_id"
        validators={{
          onSubmit: ({ value }: { value: string }) =>
            !value ? 'Please select an identity provider' : undefined,
        }}
      >
        {(field: AnyFieldApi) => (
          <div className="flex flex-col gap-1.5 mb-4">
            <label
              id="idp-label"
              htmlFor="dcr_provider_id"
              className="text-sm font-medium"
            >
              Identity Provider{' '}
              <span className="text-muted-foreground text-xs">(Required)</span>
            </label>
            <Select
              value={field.state.value ?? ''}
              onValueChange={(val) => { if (val) field.handleChange(val); }}
              disabled={isEdit}
              itemToStringLabel={(v: string) => data?.find((item) => item.id === v)?.name ?? v}
            >
              <SelectTrigger
                id="dcr_provider_id"
                aria-labelledby="idp-label"
                className="w-full"
              >
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {data?.map((v) => (
                  <SelectItem key={v.id} value={v.id} label={v.name}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>

      <form.Field name="redirect_uris" mode="array">
        {(urisField: AnyFieldApi) => {
          const uris = (urisField.state.value ?? []) as {
            redirect_url: string;
          }[];
          return (
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-sm font-medium">
                Redirect URIs{' '}
                <span className="text-muted-foreground text-xs">(Required)</span>
              </label>
              {uris.map((_, i) => (
                <form.Field
                  key={i}
                  name={`redirect_uris[${i}].redirect_url`}
                  validators={{
                    onChange: ({ value }: { value: string }) =>
                      !value ? 'Redirect URI is required' : undefined,
                    onSubmit: ({ value }: { value: string }) =>
                      !value ? 'Redirect URI is required' : undefined,
                  }}
                >
                  {(urlField: AnyFieldApi) => (
                    <div className={cn('flex gap-2 w-full')}>
                      <div className="flex flex-col gap-1 flex-1">
                        <Input
                          id={`redirect_uris_${i}_redirect_url`}
                          value={urlField.state.value ?? ''}
                          onChange={(e) => urlField.handleChange(e.target.value)}
                          onBlur={urlField.handleBlur}
                          aria-invalid={urlField.state.meta.errors.length > 0}
                        />
                        <FieldError errors={urlField.state.meta.errors} />
                      </div>
                      {uris.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => urisField.removeValue(i)}
                          data-testid={`delete-redirect-uri-${i}`}
                          aria-label={`Delete redirect URI ${i + 1}`}
                        >
                          <TrashIcon aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  )}
                </form.Field>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() =>
                  urisField.pushValue({ redirect_url: '' })
                }
              >
                Add
              </Button>
            </div>
          );
        }}
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
    </>
  );
};

const OAuthAddDrawer = (
  props: UseDisclosureReturn & {
    setAlertData: (data: OAuthCredentialBasics['oauth']) => void;
  },
) => {
  const { open, onClose, onOk, setAlertData, ...rest } = props;
  const applicationId = useApplicationId();

  const form = useForm({
    defaultValues: {
      dcr_provider_id: '',
      redirect_uris: [{ redirect_url: '' }],
      desc: '',
    },
    onSubmit: async ({ value }) => {
      const res = await portalClient.application.credential.create(
        applicationId,
        {
          desc: value.desc,
          type: 'oauth',
          oauth: omit(
            {
              dcr_provider_id: value.dcr_provider_id,
              redirect_uris: transformRedirectURIsToAPI(value.redirect_uris),
            },
            'desc',
          ) as OAuthCredential['oauth'],
        },
      );
      setAlertData((res as OAuthCredential).oauth);
      onOk?.();
      toast.success('Add OAuth Client Successfully');
      onClose();
    },
  });

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  return (
    <Drawer
      title="Add OAuth Client"
      open={open}
      onClose={onClose}
      onOk={() => form.handleSubmit()}
      loading={form.state.isSubmitting}
      {...rest}
    >
      <Form onSubmit={() => form.handleSubmit()}>
        <FormItemOAuth form={form} />
      </Form>
    </Drawer>
  );
};

export default OAuthAddDrawer;
