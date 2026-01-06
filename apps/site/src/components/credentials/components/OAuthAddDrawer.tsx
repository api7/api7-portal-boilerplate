'use client';

import {
  ProForm,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button } from 'antd';
import { toast } from 'sonner';

import { useApplicationId } from '../hook';
import Form from '@/components/slices/form/Form';
import { portalClient } from '@/lib/portal-sdk/client';
import A7Drawer from '@/components/ui/drawer';
import IconImage from '@/components/ui/icon-image';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import useDCRProviderList from '@/lib/query/useDCRProviderList';
import { pipeProduce } from '@/helper/utils/form-producer/common';
import { produceToAPIRedirectURIs } from '@/helper/utils/form-producer/redirect_uris';
import { cn } from '@/helper/utils/tailwind';
import type {
  CredentialFormOAuth,
  OAuthCredential,
  OAuthCredentialBasics,
} from '@/types/portal-sdk';
import { omit } from 'lodash-es';

export const FormItemOAuth = ({ isEdit = false }: { isEdit?: boolean }) => {
  const { data } = useDCRProviderList({
    fetchAll: true,
  });
  return (
    <>
      <ProFormSelect
        options={data?.map((v) => ({
          label: v.name,
          value: v.id,
        }))}
        name="dcr_provider_id"
        label="Identity Provider"
        required
        rules={[{ required: true }]}
        disabled={isEdit}
      />
      <ProFormList
        label="Redirect URIs"
        name={'redirect_uris'}
        required
        copyIconProps={false}
        deleteIconProps={false}
        creatorButtonProps={{
          creatorButtonText: 'Add',
          className: '!w-fit !border-solid',
        }}
        initialValue={[{ redirect_uri: undefined }]}
        containerStyle={{ width: '100%' }}
      >
        {(meta, index, field, count) => {
          return (
            <div className={cn('flex gap-2 w-full')} style={{ width: '100%' }}>
              <ProFormText
                name={`redirect_url`}
                placeholder=""
                required
                formItemProps={{
                  className: 'w-full mb-2',
                }}
                className="w-full"
                rules={[
                  { required: true, message: 'Redirect URI is required' },
                ]}
              />
              {count > 1 && (
                <Button
                  variant="text"
                  icon={
                    <IconImage
                      width={24}
                      height={24}
                      className="size-12"
                      type="delete"
                    />
                  }
                  onClick={() => field.remove(meta.name)}
                  data-testid={`delete-redirect-uri-${index}`}
                  className="border-none shadow-none ml-0.5"
                />
              )}
            </div>
          );
        }}
      </ProFormList>
      <ProFormTextArea label="Description" name={'desc'} placeholder="" />
    </>
  );
};

const OAuthAddDrawer = (
  props: UseDisclosureReturn & {
    setAlertData: (data: OAuthCredentialBasics['oauth']) => void;
  }
) => {
  const { open, onClose, onOk, setAlertData, ...rest } = props;
  const [form] = ProForm.useForm();
  const applicationId = useApplicationId();
  const submitAdd = (form: CredentialFormOAuth) => {
    const d = pipeProduce(produceToAPIRedirectURIs)(form);
    return portalClient.application.credential
      .create(applicationId, {
        desc: form.desc,
        type: 'oauth',
        oauth: omit(d, 'desc') as OAuthCredential['oauth'],
      })
      .then((res) => {
        setAlertData((res as OAuthCredential).oauth);
      })
      .then(() => {
        onOk?.();
        return toast.success('Add OAuth Client Successfully');
      })
      .then(onClose);
  };
  return (
    <A7Drawer
      title={'Add OAuth Client'}
      open={open}
      onClose={onClose}
      onOk={form.submit}
      destroyOnHidden
      {...rest}
    >
      <Form<CredentialFormOAuth>
        form={form}
        onFinish={submitAdd}
        submitter={false}
        preserve={false}
      >
        <FormItemOAuth />
      </Form>
    </A7Drawer>
  );
};

export default OAuthAddDrawer;
