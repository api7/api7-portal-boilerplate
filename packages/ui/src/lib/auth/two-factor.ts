export type UserWithTwoFactor = {
  twoFactorEnabled?: boolean | null;
};

/** `twoFactorEnabled` is added by the `twoFactor` plugin and isn't part of the base `User` type. */
export const isTwoFactorEnabled = (user: UserWithTwoFactor | null | undefined): boolean =>
  !!user?.twoFactorEnabled;
