'use client';

import { useEffect } from 'react';

import { ProForm } from '@ant-design/pro-components';
import { toast } from 'sonner';

import { FormItemOAuth } from './OAuthAddDrawer';
import { useApplicationId } from '../hook';
import Form from '@/components/slices/form/Form';
import { portalClient } from '@/lib/portal-sdk/client';
import A7Drawer from '@/components/ui/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import {
  transformAPIRedirectURIsToForm,
  transformRedirectURIsToAPI,
} from '@/helper/utils/form-producer/redirect_uris';
import type { CredentialFormOAuth, OAuthCredential } from '@/types/portal-sdk';

export type OAuthEditDrawerProps = UseDisclosureReturn & {
  oldData?: OAuthCredential;
  title: string;
};

const OAuthEditDrawer = (props: OAuthEditDrawerProps) => {
  const { open, onOk, oldData, title, ...rest } = props;
  const [form] = ProForm.useForm();
  const applicationId = useApplicationId();

  useEffect(() => form.resetFields(), [form, oldData]);

  const submitEdit = (form: CredentialFormOAuth) => {
    return portalClient.application.credential
      .update(applicationId, oldData!.id, {
        desc: form.desc || oldData?.desc,
        type: 'oauth',
        oauth: {
          redirect_uris: transformRedirectURIsToAPI(form.redirect_uris),
        },
      })
      .then(() => {
        onOk?.();
        toast.success(`${title} Successfully`);
      })
      .then(props?.onClose);
  };

  const formInitialValues = {
    ...oldData?.oauth,
    desc: oldData?.desc,
    redirect_uris: transformAPIRedirectURIsToForm(
      oldData?.oauth?.redirect_uris
    ),
  };
  return (
    <A7Drawer
      open={open}
      title={title}
      onOk={form.submit}
      okText="Save"
      {...rest}
    >
      <Form<CredentialFormOAuth>
        form={form}
        onFinish={submitEdit}
        submitter={false}
        initialValues={formInitialValues}
      >
        <FormItemOAuth isEdit={true} />
      </Form>
    </A7Drawer>
  );
};

export default OAuthEditDrawer;
