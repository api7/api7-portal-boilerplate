import {
  getAuthErrorCode,
  getAuthErrorMessage as getDefaultAuthErrorMessage,
} from '@better-auth-ui/core';

export const BANNED_USER_MESSAGE =
  'Your account has been suspended. Please contact your portal administrator.';

export function getAuthErrorMessage(
  ...args: Parameters<typeof getDefaultAuthErrorMessage>
): string | null {
  if (getAuthErrorCode(args[0]) === 'BANNED_USER') return BANNED_USER_MESSAGE;
  return getDefaultAuthErrorMessage(...args);
}
