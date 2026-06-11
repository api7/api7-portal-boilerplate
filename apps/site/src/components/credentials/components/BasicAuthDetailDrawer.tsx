'use client';

import Alert from '@/components/ui-legacy/alert';
import { DescTemplate } from '@/components/ui-legacy/desc-template';
import Drawer from '@/components/base/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import type {
  BasicAuthCredential,
  BasicAuthPluginValue,
} from '@/types/portal-sdk';

type Props = UseDisclosureReturn & {
  oldData?: BasicAuthCredential;
};

const BasicAuthDetailDrawer = (props: Props) => {
  const { open, oldData, ...rest } = props;

  return (
    <Drawer
      open={open}
      title={'Basic Authentication Credential Detail'}
      {...rest}
      cancelText="Close"
    >
      <DescTemplate
        items={[
          {
            key: 'username',
            label: 'Username',
            children: (oldData?.['basic-auth'] as BasicAuthPluginValue)
              ?.username,
          },
          {
            key: 'password',
            label: 'Password',
            children: (
              <Alert
                variant="info"
                description="For security reasons, the password is only shown once when the credential is created or regenerated. Regenerate the credential to set a new password."
              />
            ),
          },
        ]}
      />
    </Drawer>
  );
};

export default BasicAuthDetailDrawer;
