import { cn } from '@/lib/utils';
import { Tag, type TagProps } from 'antd';
import colors from 'tailwindcss/colors';

export type A7LabelProps = TagProps & {
  isStatus?: boolean;
  color?: string;
};

const StatusPoint = (props: { color: string }) => (
  <div
    className={cn(
      'size-[6px] rounded-full mr-1',
      props.color === 'green' && 'bg-green-700',
      props.color === 'gray' && 'bg-gray-700',
      'w-2 h-2 align-middle'
    )}
  />
);

const A7Label: React.FC<A7LabelProps> = ({
  children,
  isStatus = false,
  color = 'default',
  ...rest
}) => {
  const ccolor = isStatus ? colors[color as keyof typeof colors] : color;
  const bgColor = isStatus ? ccolor['100'] : color;
  const textColor = isStatus ? ccolor['700'] : color;

  return (
    <Tag
      color={color}
      {...rest}
      className={cn(
        'text-xs',
        isStatus && `flex! items-center py-[2px]`,
        rest.className
      )}
      style={{
        ...(isStatus && {
          backgroundColor: bgColor,
          color: textColor,
        }),
        ...rest.style,
      }}
    >
      {isStatus && <StatusPoint color={color} />}
      {children}
    </Tag>
  );
};

export default A7Label;
