export type BetterAuthLogin = {
  email: string;
  password: string;
  name: string;
  // extend for convenience
  organization?: string;
  id?: string;
};
