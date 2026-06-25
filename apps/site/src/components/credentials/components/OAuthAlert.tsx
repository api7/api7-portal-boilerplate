'use client';

import { CheckIcon, CopyIcon, InfoIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { useClipboard } from '@/lib/hooks/useClipboard';

type OAuthAlertProps = {
  clientID: string;
  clientSecret: string;
  title?: string;
  description?: string;
};

export const OAuthAlert = (props: OAuthAlertProps) => {
  const clientIDClipboard = useClipboard(props.clientID);
  const clientSecretClipboard = useClipboard(props.clientSecret);
  return (
    <div className="w-175 pt-[35px]">
      <Alert>
        <InfoIcon />
        <AlertTitle>{props.title ?? 'OAuth Client Created'}</AlertTitle>
        <AlertDescription>
          {props.description ??
            'Please copy and save it immediately, you will not be able to view Client Secret again.'}
        </AlertDescription>
      </Alert>

      <InputGroup className="mt-2">
        <InputGroupInput value={props.clientID} readOnly />
        <InputGroupAddon align="inline-start" className="min-w-37.5 border-e">
          <InputGroupText>Client ID</InputGroupText>
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Copy"
            title="Copy"
            size="icon-xs"
            onClick={() => clientIDClipboard.onCopy()}
          >
            {clientIDClipboard.hasCopied ? <CheckIcon /> : <CopyIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      <InputGroup className="mt-2">
        <InputGroupInput value={props.clientSecret} readOnly />
        <InputGroupAddon align="inline-start" className="min-w-37.5 border-e">
          <InputGroupText>Client Secret</InputGroupText>
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Copy"
            title="Copy"
            size="icon-xs"
            onClick={() => clientSecretClipboard.onCopy()}
          >
            {clientSecretClipboard.hasCopied ? <CheckIcon /> : <CopyIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
};
