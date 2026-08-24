'use client';

import { CheckIcon, CopyIcon, InfoIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@api7/portal-ui/components/ui/alert';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@api7/portal-ui/components/ui/input-group';
import { useClipboard } from '@/lib/hooks/useClipboard';

type SecretAlertItem = {
  label: string;
  value: string;
};

type SecretAlertProps = {
  items: SecretAlertItem[];
  title: string;
  description: string;
};

const SecretAlertField = ({ label, value }: SecretAlertItem) => {
  const clipboard = useClipboard(value);
  return (
    <InputGroup className="mt-2">
      <InputGroupInput value={value} readOnly aria-label={label} />
      <InputGroupAddon align="inline-start" className="min-w-37.5 border-e">
        <InputGroupText>{label}</InputGroupText>
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="Copy"
          title="Copy"
          size="icon-xs"
          onClick={() => clipboard.onCopy()}
        >
          {clipboard.hasCopied ? <CheckIcon /> : <CopyIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
};

/**
 * One-time reveal of credential secrets (e.g. key-auth key, basic-auth
 * username/password). The backend only returns these values on creation and
 * regeneration, so they must be copied immediately — they cannot be viewed
 * again afterwards.
 */
export const SecretAlert = (props: SecretAlertProps) => {
  return (
    <div className="w-175 pt-[35px]">
      <Alert>
        <InfoIcon />
        <AlertTitle>{props.title}</AlertTitle>
        <AlertDescription>{props.description}</AlertDescription>
      </Alert>
      {props.items.map((item) => (
        <SecretAlertField key={item.label} {...item} />
      ))}
    </div>
  );
};

export default SecretAlert;
