'use client';

import { useContext, useMemo } from 'react';
import { AuthUIContext } from '@daveyplate/better-auth-ui';
import { UserAvatar } from '@daveyplate/better-auth-ui';
import type { UserViewProps } from '@daveyplate/better-auth-ui';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Copied from better-auth-ui's PersonalAccountView (not publicly exported).
 *
 * Displays user information with avatar and "Personal Account" subtitle.
 */
export function PersonalAccountView({
  className,
  classNames,
  isPending,
  size,
  user,
  localization: propLocalization,
}: UserViewProps) {
  const { localization: contextLocalization } = useContext(AuthUIContext);

  const localization = useMemo(
    () => ({ ...contextLocalization, ...propLocalization }),
    [contextLocalization, propLocalization],
  );

  return (
    <div className={cn('flex items-center gap-2', className, classNames?.base)}>
      <UserAvatar
        className={cn(size !== 'sm' && 'my-0.5')}
        classNames={classNames?.avatar}
        isPending={isPending}
        localization={localization}
        size={size}
        user={user}
      />

      <div
        className={cn('grid flex-1 text-left leading-tight', classNames?.content)}
      >
        {isPending ? (
          <>
            <Skeleton
              className={cn(
                'max-w-full',
                size === 'lg' ? 'h-4.5 w-32' : 'h-3.5 w-24',
                classNames?.title,
                classNames?.skeleton,
              )}
            />
            {size !== 'sm' && (
              <Skeleton
                className={cn(
                  'mt-1.5 max-w-full',
                  size === 'lg' ? 'h-3.5 w-40' : 'h-3 w-32',
                  classNames?.subtitle,
                  classNames?.skeleton,
                )}
              />
            )}
          </>
        ) : (
          <>
            <span
              className={cn(
                'truncate font-semibold',
                size === 'lg' ? 'text-base' : 'text-sm',
                classNames?.title,
              )}
            >
              {user?.displayName ||
                user?.name ||
                user?.fullName ||
                user?.firstName ||
                user?.displayUsername ||
                user?.username ||
                user?.email ||
                localization?.USER}
            </span>
            {size !== 'sm' && (
              <span
                className={cn(
                  'truncate opacity-70',
                  size === 'lg' ? 'text-sm' : 'text-xs',
                  classNames?.subtitle,
                )}
              >
                {localization?.PERSONAL_ACCOUNT}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
