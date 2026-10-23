import {
  getAuthErrorCode,
  getAuthErrorMessage as getDefaultAuthErrorMessage,
} from '@better-auth-ui/core';

// Codes @better-auth-ui/core has no mapping for; it would show a generic 4xx text.
export const AUTH_ERROR_MESSAGES = {
  BANNED_USER:
    'Your account has been suspended. Please contact your portal administrator.',
  // Better Auth's own wording, kept verbatim.
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
    'You cannot leave the organization as the only owner',
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER:
    'You cannot leave the organization without an owner',
} satisfies Record<string, string>;

export const BANNED_USER_MESSAGE = AUTH_ERROR_MESSAGES.BANNED_USER;

const hasCustomMessage = (
  code: string,
): code is keyof typeof AUTH_ERROR_MESSAGES =>
  Object.hasOwn(AUTH_ERROR_MESSAGES, code);

export function getAuthErrorMessage(
  ...args: Parameters<typeof getDefaultAuthErrorMessage>
): string | null {
  const code = getAuthErrorCode(args[0]);
  return code && hasCustomMessage(code)
    ? AUTH_ERROR_MESSAGES[code]
    : getDefaultAuthErrorMessage(...args);
}
