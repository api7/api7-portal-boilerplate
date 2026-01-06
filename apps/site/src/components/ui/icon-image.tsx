'use client';

import Image from 'next/image';
import type { ImageProps } from 'next/image';

import { cn } from '@/lib/utils';

export type BareIconImageProps = Omit<
  ImageProps,
  'src' | 'alt'
> & {
  size?: number;
  src: string;
  alt?: string;
};

export type IconImageProps = Omit<BareIconImageProps, 'src'> & {
  type?:
    | 'normal'
    | 'add'
    | 'edit'
    | 'delete'
    | 're-invite'
    | 'duplicate'
    | 'draft'
    | 'publish'
    | 'start'
    | 'pause'
    | 'finish'
    | 'navigation'
    | 'refresh'
    | 'reset'
    | 'text'
    | 'enter'
    | 'close'
    | 'more'
    | 'switch-fill'
    | 'search'
    | 'lock'
    | 'down-arrow';
  alt?: string;
};

export const BareIconImage = (props: BareIconImageProps) => {
  const { className, size, src, alt = '', ...rest } = props;
  const iconSize = size || 14;
  return (
    <Image
      src={src}
      alt={alt}
      width={iconSize}
      height={iconSize}
      className={cn(className)}
      style={{ width: iconSize, height: iconSize }}
      unoptimized
      {...rest}
    />
  );
};

const IconImage = (props: IconImageProps) => {
  const { type, className, alt = '', ...rest } = props;
  const iconSrc = type ? `/icons/${type}.svg` : '';
  const iconAlt = alt || `${type || 'icon'} icon`;

  if (!iconSrc) {
    return null;
  }

  return (
    <BareIconImage
      className={cn(`${type}-icon`, className)}
      src={iconSrc}
      alt={iconAlt}
      {...rest}
    />
  );
};

export default IconImage;

