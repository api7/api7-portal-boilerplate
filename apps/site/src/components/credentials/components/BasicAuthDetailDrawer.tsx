'use client';

import MaskCopyTextItem from './MaskCopyTextItem';
import { DescTemplate } from '@/components/ui-legacy/desc-template';
import A7Drawer from '@/components/ui-legacy/drawer';
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
    <A7Drawer
      open={open}
      title={'Basic Authentication Credential Detail'}
      {...rest}
      cancelText="Close"
    >
      <DescTemplate
        column={1}
        items={[
          {
            key: 'username',
            label: 'Username',
            children: (oldData?.['basic-auth'] as BasicAuthPluginValue)?.username,
          },
          {
            key: 'password',
            label: 'Password',
            children: (
              <MaskCopyTextItem
                value={(oldData?.['basic-auth'] as BasicAuthPluginValue)?.password}
              />
            ),
          },
        ]}
      />
    </A7Drawer>
  );
};

export default BasicAuthDetailDrawer;
