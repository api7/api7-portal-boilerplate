/**
 * One-shot, in-memory-only handoff of the password a user just typed into
 * the sign-in form, so a subsequent forced 2FA enrollment step doesn't need
 * to ask for it again. Never persisted to storage, cookies, or the URL —
 * cleared the moment it's read, and lost on a hard reload (the enrollment
 * view falls back to prompting for the password in that case).
 */
let pendingPassword: string | null = null;

export function stashTwoFactorPassword(password: string) {
  pendingPassword = password;
}

export function consumeTwoFactorPassword(): string | null {
  const password = pendingPassword;
  pendingPassword = null;
  return password;
}
