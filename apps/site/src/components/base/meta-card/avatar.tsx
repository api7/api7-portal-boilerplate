import React, { useId } from 'react';

import Image from 'next/image';

import { Skeleton } from '@/components/ui/skeleton';

type BgFn = (props: React.SVGAttributes<SVGElement>, p: string) => React.ReactNode;

const backgrounds: BgFn[] = [
  (props, p) => (
    <svg
      key="0"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath={`url(#${p}c)`}>
        <mask
          id={`${p}m`}
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="80"
          height="80"
        >
          <path d="M80 0H0V80H80V0Z" fill="white" />
        </mask>
        <g mask={`url(#${p}m)`}>
          <path d="M80 7.62939e-06H0V80H80V7.62939e-06Z" fill="white" />
          <path
            d="M80 0.0150833H0V80.0151H80V0.0150833Z"
            fill={`url(#${p}0)`}
          />
          <path
            opacity="0.6"
            d="M39.4679 -46.6789L-46.5107 39.2996L-2.63145 83.1788L83.3471 -2.79972L39.4679 -46.6789Z"
            fill={`url(#${p}1)`}
          />
          <path
            opacity="0.7"
            d="M26.7785 -59.3682L-59.2 26.6103L-13.9452 71.8652L72.0333 -14.1134L26.7785 -59.3682Z"
            fill={`url(#${p}2)`}
          />
          <path
            opacity="0.9"
            d="M26.7785 -59.3682L-59.2 26.6103L-25.2589 60.5515L60.7196 -25.4271L26.7785 -59.3682Z"
            fill={`url(#${p}3)`}
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={`${p}0`}
          x1="80"
          y1="80"
          x2="0"
          y2="0.0150833"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E6B300" />
          <stop offset="1" stopColor="#FDFF88" />
        </linearGradient>
        <linearGradient
          id={`${p}1`}
          x1="83.3473"
          y1="-2.79961"
          x2="-26.4031"
          y2="-36.1242"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}2`}
          x1="72.0335"
          y1="-14.1134"
          x2="-40.798"
          y2="-46.7852"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}3`}
          x1="60.7197"
          y1="-25.4271"
          x2="-25.1346"
          y2="-61.0775"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}c`}>
          <rect width="80" height="80" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ),
  (props, p) => (
    <svg
      key="1"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath={`url(#${p}c)`}>
        <mask
          id={`${p}m`}
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="80"
          height="80"
        >
          <path d="M80 0H0V80H80V0Z" fill="white" />
        </mask>
        <g mask={`url(#${p}m)`}>
          <path d="M80 7.62939e-06H0V80H80V7.62939e-06Z" fill="white" />
          <path
            d="M80 0.0150833H0V80.0151H80V0.0150833Z"
            fill={`url(#${p}0)`}
          />
          <path
            opacity="0.5"
            d="M38.6679 -46.6789L-47.3106 39.2996L-3.43144 83.1788L82.5471 -2.79972L38.6679 -46.6789Z"
            fill={`url(#${p}1)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-14.7452 71.8652L71.2334 -14.1134L25.9785 -59.3682Z"
            fill={`url(#${p}2)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-26.0589 60.5515L59.9196 -25.4271L25.9785 -59.3682Z"
            fill={`url(#${p}3)`}
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={`${p}0`}
          x1="80"
          y1="80.0152"
          x2="0"
          y2="0.0150833"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#17A2B5" />
          <stop offset="1" stopColor="#69FFDB" />
        </linearGradient>
        <linearGradient
          id={`${p}1`}
          x1="82.5473"
          y1="-2.79961"
          x2="-27.2031"
          y2="-36.1242"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}2`}
          x1="71.2335"
          y1="-14.1134"
          x2="-41.5979"
          y2="-46.7852"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}3`}
          x1="59.9197"
          y1="-25.4271"
          x2="-25.9345"
          y2="-61.0775"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}c`}>
          <rect width="80" height="80" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ),
  (props, p) => (
    <svg
      key="2"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath={`url(#${p}c)`}>
        <mask
          id={`${p}m`}
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="80"
          height="80"
        >
          <path d="M80 0H0V80H80V0Z" fill="white" />
        </mask>
        <g mask={`url(#${p}m)`}>
          <path d="M80 7.62939e-06H0V80H80V7.62939e-06Z" fill="white" />
          <path
            d="M80 0.0150833H0V80.0151H80V0.0150833Z"
            fill={`url(#${p}0)`}
          />
          <path
            opacity="0.5"
            d="M38.6679 -46.6789L-47.3106 39.2996L-3.43144 83.1788L82.5471 -2.79972L38.6679 -46.6789Z"
            fill={`url(#${p}1)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-14.7452 71.8652L71.2334 -14.1134L25.9785 -59.3682Z"
            fill={`url(#${p}2)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-26.0589 60.5515L59.9196 -25.4271L25.9785 -59.3682Z"
            fill={`url(#${p}3)`}
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={`${p}0`}
          x1="80"
          y1="80.0152"
          x2="0"
          y2="0.0150833"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1773B5" />
          <stop offset="1" stopColor="#69E4FF" />
        </linearGradient>
        <linearGradient
          id={`${p}1`}
          x1="82.5473"
          y1="-2.79961"
          x2="-27.2031"
          y2="-36.1242"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}2`}
          x1="71.2335"
          y1="-14.1134"
          x2="-41.5979"
          y2="-46.7852"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}3`}
          x1="59.9197"
          y1="-25.4271"
          x2="-25.9345"
          y2="-61.0775"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}c`}>
          <rect width="80" height="80" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ),
  (props, p) => (
    <svg
      key="3"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath={`url(#${p}c)`}>
        <mask
          id={`${p}m`}
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="80"
          height="80"
        >
          <path d="M80 0H0V80H80V0Z" fill="white" />
        </mask>
        <g mask={`url(#${p}m)`}>
          <path d="M80 7.62939e-06H0V80H80V7.62939e-06Z" fill="white" />
          <path
            d="M80 0.0150833H0V80.0151H80V0.0150833Z"
            fill={`url(#${p}0)`}
          />
          <path
            opacity="0.3"
            d="M38.6679 -46.6789L-47.3106 39.2996L-3.43144 83.1788L82.5471 -2.79972L38.6679 -46.6789Z"
            fill={`url(#${p}1)`}
          />
          <path
            opacity="0.3"
            d="M25.9785 -59.3682L-60 26.6103L-14.7452 71.8652L71.2334 -14.1134L25.9785 -59.3682Z"
            fill={`url(#${p}2)`}
          />
          <path
            opacity="0.3"
            d="M25.9785 -59.3682L-60 26.6103L-26.0589 60.5515L59.9196 -25.4271L25.9785 -59.3682Z"
            fill={`url(#${p}3)`}
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={`${p}0`}
          x1="80"
          y1="80"
          x2="0"
          y2="0.0150833"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D60000" />
          <stop offset="0.536458" stopColor="#FF7777" />
          <stop offset="1" stopColor="#FF8888" />
        </linearGradient>
        <linearGradient
          id={`${p}1`}
          x1="82.5473"
          y1="-2.79961"
          x2="-27.2031"
          y2="-36.1242"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}2`}
          x1="71.2335"
          y1="-14.1134"
          x2="-41.5979"
          y2="-46.7852"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}3`}
          x1="59.9197"
          y1="-25.4271"
          x2="-25.9345"
          y2="-61.0775"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}c`}>
          <rect width="80" height="80" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ),
  (props, p) => (
    <svg
      key="4"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath={`url(#${p}c)`}>
        <mask
          id={`${p}m`}
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="80"
          height="80"
        >
          <path d="M80 0H0V80H80V0Z" fill="white" />
        </mask>
        <g mask={`url(#${p}m)`}>
          <path d="M80 7.62939e-06H0V80H80V7.62939e-06Z" fill="white" />
          <path
            d="M80 0.0150833H0V80.0151H80V0.0150833Z"
            fill={`url(#${p}0)`}
          />
          <path
            opacity="0.5"
            d="M38.6679 -46.6789L-47.3106 39.2996L-3.43144 83.1788L82.5471 -2.79972L38.6679 -46.6789Z"
            fill={`url(#${p}1)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-14.7452 71.8652L71.2334 -14.1134L25.9785 -59.3682Z"
            fill={`url(#${p}2)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-26.0589 60.5515L59.9196 -25.4271L25.9785 -59.3682Z"
            fill={`url(#${p}3)`}
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={`${p}0`}
          x1="80"
          y1="80.0152"
          x2="0"
          y2="0.0150833"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#5D17B5" />
          <stop offset="1" stopColor="#698AFF" />
        </linearGradient>
        <linearGradient
          id={`${p}1`}
          x1="82.5473"
          y1="-2.79961"
          x2="-27.2031"
          y2="-36.1242"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}2`}
          x1="71.2335"
          y1="-14.1134"
          x2="-41.5979"
          y2="-46.7852"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}3`}
          x1="59.9197"
          y1="-25.4271"
          x2="-25.9345"
          y2="-61.0775"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}c`}>
          <rect width="80" height="80" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ),
  (props, p) => (
    <svg
      key="5"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath={`url(#${p}c)`}>
        <mask
          id={`${p}m`}
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="80"
          height="80"
        >
          <path d="M80 0H0V80H80V0Z" fill="white" />
        </mask>
        <g mask={`url(#${p}m)`}>
          <path d="M80 7.62939e-06H0V80H80V7.62939e-06Z" fill="white" />
          <path
            d="M80 0.0150833H0V80.0151H80V0.0150833Z"
            fill={`url(#${p}0)`}
          />
          <path
            opacity="0.5"
            d="M38.6679 -46.6789L-47.3106 39.2996L-3.43144 83.1788L82.5471 -2.79972L38.6679 -46.6789Z"
            fill={`url(#${p}1)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-14.7452 71.8652L71.2334 -14.1134L25.9785 -59.3682Z"
            fill={`url(#${p}2)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-26.0589 60.5515L59.9196 -25.4271L25.9785 -59.3682Z"
            fill={`url(#${p}3)`}
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={`${p}0`}
          x1="80"
          y1="80.0152"
          x2="0"
          y2="0.0150833"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#17B53A" />
          <stop offset="1" stopColor="#69FF8A" />
        </linearGradient>
        <linearGradient
          id={`${p}1`}
          x1="82.5473"
          y1="-2.79961"
          x2="-27.2031"
          y2="-36.1242"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}2`}
          x1="71.2335"
          y1="-14.1134"
          x2="-41.5979"
          y2="-46.7852"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}3`}
          x1="59.9197"
          y1="-25.4271"
          x2="-25.9345"
          y2="-61.0775"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}c`}>
          <rect width="80" height="80" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ),
  (props, p) => (
    <svg
      key="6"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath={`url(#${p}c)`}>
        <mask
          id={`${p}m`}
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="80"
          height="80"
        >
          <path d="M80 0H0V80H80V0Z" fill="white" />
        </mask>
        <g mask={`url(#${p}m)`}>
          <path d="M80 7.62939e-06H0V80H80V7.62939e-06Z" fill="white" />
          <path
            d="M80 0.0150833H0V80.0151H80V0.0150833Z"
            fill={`url(#${p}0)`}
          />
          <path
            opacity="0.5"
            d="M38.6679 -46.6789L-47.3106 39.2996L-3.43144 83.1788L82.5471 -2.79972L38.6679 -46.6789Z"
            fill={`url(#${p}1)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-14.7452 71.8652L71.2334 -14.1134L25.9785 -59.3682Z"
            fill={`url(#${p}2)`}
          />
          <path
            opacity="0.5"
            d="M25.9785 -59.3682L-60 26.6103L-26.0589 60.5515L59.9196 -25.4271L25.9785 -59.3682Z"
            fill={`url(#${p}3)`}
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={`${p}0`}
          x1="80"
          y1="80.0152"
          x2="0"
          y2="0.0150833"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#B56317" />
          <stop offset="1" stopColor="#FFC369" />
        </linearGradient>
        <linearGradient
          id={`${p}1`}
          x1="82.5473"
          y1="-2.79961"
          x2="-27.2031"
          y2="-36.1242"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}2`}
          x1="71.2335"
          y1="-14.1134"
          x2="-41.5979"
          y2="-46.7852"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${p}3`}
          x1="59.9197"
          y1="-25.4271"
          x2="-25.9345"
          y2="-61.0775"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}c`}>
          <rect width="80" height="80" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ),
];

export type MetaCardAvatarProps = WithLoading<{
  name: string;
  src?: string;
  size?: number;
}>;

export const MetaCardAvatar = (props: MetaCardAvatarProps) => {
  const { isLoading, name, src, size = 64 } = props;
  const svgId = useId().replace(/:/g, '');
  if (isLoading || !name)
    return <Skeleton style={{ width: size, height: size }} />;
  if (src)
    return (
      <Image
        src={src}
        width={size}
        height={size}
        alt={name}
        className="rounded overflow-hidden"
        unoptimized
      />
    );
  const initials = name.slice(0, /^[a-zA-Z]+$/.test(name[0]) ? 2 : 1);
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center">
      <div className="rounded overflow-hidden">
        {backgrounds[name.slice(0, 2).charCodeAt(0) % backgrounds.length](
          { width: size, height: size },
          svgId,
        ) as React.ReactNode}
      </div>
      <p className="absolute left-1/2 top-1/2 m-0 -translate-x-1/2 -translate-y-1/2 text-xl font-medium leading-none text-white">
        {initials}
      </p>
    </div>
  );
};
