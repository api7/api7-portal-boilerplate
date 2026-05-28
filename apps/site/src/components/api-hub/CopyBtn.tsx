import { useClipboard } from '@chakra-ui/react';

import { Button, ButtonProps } from 'antd';
import { BareIconImage } from '@/components/ui-legacy/icon-image';
import { cn } from '@/lib/utils';
type Props = {
  content: string;
} & Pick<ButtonProps, 'size' | 'classNames'>;

export const CopyBtn: React.FC<Props> = (props) => {
  const { content, classNames, size = 'small' } = props;
  const { hasCopied, onCopy } = useClipboard(content);
  const icon = hasCopied
    ? { src: '/icons/check.svg', id: 'check-img' }
    : { src: '/icons/copy.svg', id: 'copy-img' };
  return (
    <Button
      onClick={onCopy}
      className={cn('ml-1')}
      classNames={classNames}
      size={size}
      icon={<BareIconImage {...icon} />}
    />
  );
};
