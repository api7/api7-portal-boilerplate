import Image from 'next/image';

import ProductAvatar from '@/components/api-hub/ProductAvatar';
import { Skeleton } from '@/components/ui/skeleton';

export type MetaCardAvatarProps = WithLoading<{
  name: string;
  src?: string;
  size?: number;
}>;

export const MetaCardAvatar = (props: MetaCardAvatarProps) => {
  const { isLoading, name, src, size = 64 } = props;
  if (isLoading || !name)
    return <Skeleton style={{ width: size, height: size }} />;
  return src ? (
    <Image
      src={src}
      width={size}
      height={size}
      alt={name}
      className="rounded overflow-hidden"
      unoptimized
    />
  ) : (
    <ProductAvatar text={name} width={size} height={size} />
  );
};
