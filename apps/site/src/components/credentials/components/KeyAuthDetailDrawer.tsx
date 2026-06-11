'use client';

import Alert from '@/components/ui-legacy/alert';
import { DescTemplate } from '@/components/ui-legacy/desc-template';
import Drawer from '@/components/base/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import type { KeyAuthCredential } from '@/types/portal-sdk';

type Props = UseDisclosureReturn & {
  oldData?: KeyAuthCredential;
};

const KeyAuthDetailDrawer = (props: Props) => {
  const { open, oldData, ...rest } = props;

  return (
    <Drawer
      open={open}
      title="Key Authentication Credential Detail"
      {...rest}
      cancelText="Close"
    >
      <DescTemplate
        items={[
          {
            key: 'name',
            label: 'Name',
            children: oldData?.name,
          },
          {
            key: 'key',
            label: 'Key',
            children: (
              <Alert
                variant="info"
                description="For security reasons, the key is only shown once when the credential is created or regenerated. Regenerate the credential to obtain a new key."
              />
            ),
          },
        ]}
      />
    </Drawer>
  );
};

export default KeyAuthDetailDrawer;
