import { CheckIcon, CopyIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClipboard } from '@chakra-ui/react';

type Props = {
  content: string;
};

export const CopyButton: React.FC<Props> = (props) => {
  const { content } = props;
  const { hasCopied, onCopy } = useClipboard(content);
  return (
    <Button
      className={cn('ml-1')}
      size="icon-xs"
      variant="outline"
      onClick={onCopy}
    >
      {hasCopied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
};
