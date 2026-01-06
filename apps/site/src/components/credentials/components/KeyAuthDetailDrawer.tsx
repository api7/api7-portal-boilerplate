'use client';

import { FormItemKey } from './KeyAuthAddDrawer';
import MaskCopyTextItem from './MaskCopyTextItem';
import A7Drawer from '@/components/ui/drawer';
import type { UseDisclosureReturn } from '@/lib/hooks/useDisclosure';
import type { KeyAuthCredential, KeyAuthPluginValue } from '@/types/portal-sdk';

type Props = UseDisclosureReturn & {
  oldData?: KeyAuthCredential;
};

const KeyAuthDetailDrawer = (props: Props) => {
  const { open, oldData, ...rest } = props;

  return (
    <A7Drawer
      open={open}
      title={'Key Authentication Credential Detail'}
      {...rest}
      cancelText="Close"
    >
      <FormItemKey required={false} layout="vertical">
        <MaskCopyTextItem value={(oldData?.['key-auth'] as KeyAuthPluginValue)?.key || ''} />
      </FormItemKey>
    </A7Drawer>
  );
};

export default KeyAuthDetailDrawer;
