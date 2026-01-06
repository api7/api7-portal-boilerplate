'use client';

import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { useClipboard } from '@chakra-ui/react';
import { Alert as AntdAlert, Input, Space, Button } from 'antd';
type OAuthAlertProps = {
  clientID: string;
  clientSecret: string;
};

export const OAuthAlert = (props: OAuthAlertProps) => {
  const clientIDClipboard = useClipboard(props.clientID);
  const clientSecretClipboard = useClipboard(props.clientSecret);
  return (
    <div className="pt-35px">
      <AntdAlert
        message="OAuth Client Created"
        description="Please copy and save it immediately, you will not be able to view Client Secret
            again."
        type="info"
        showIcon
      />

      <Space
        direction="vertical"
        size="small"
        className="gap-1"
        style={{ width: '700px', marginTop: '10px' }}
      >
        <Space.Compact style={{ width: '100%' }}>
          <Input
            addonBefore={<div style={{ minWidth: '150px' }}>Client ID</div>}
            value={props.clientID}
            addonAfter={
              <Button
                type="text"
                onClick={() => clientIDClipboard.onCopy()}
                size="small"
              >
                {clientIDClipboard.hasCopied ? (
                  <CheckOutlined />
                ) : (
                  <CopyOutlined />
                )}
              </Button>
            }
          />
        </Space.Compact>

        <Space.Compact style={{ width: '100%' }}>
          <Input
            addonBefore={<div style={{ minWidth: '150px' }}>Client Secret</div>}
            value={props.clientSecret}
            addonAfter={
              <Button
                type="text"
                onClick={() => clientSecretClipboard.onCopy()}
                size="small"
              >
                {clientSecretClipboard.hasCopied ? (
                  <CheckOutlined />
                ) : (
                  <CopyOutlined />
                )}
              </Button>
            }
          />
        </Space.Compact>
      </Space>
    </div>
  );
};
