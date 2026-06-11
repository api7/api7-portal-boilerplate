type Overwrite<T, U> = Omit<T, keyof U> & U;
type Optional<T> = { [P in keyof T]?: T[P] };
type Nilable<T> = T | null | undefined;
type RenameField<T, K extends keyof T, NewKey extends string> = {
  [P in keyof T as P extends K ? NewKey : P]: T[P];
};
type OmitByPath<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? { [K in keyof T]: K extends Key ? OmitByPath<T[K], Rest> : T[K] }
    : T
  : Omit<T, P>;

type TableParams = {
  search?: string;
  labels?: Record<string, string>;
  order_by?: string;
  direction?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
};

type Prettify<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown> ? Prettify<T[K]> : T[K];
} & {};

type ListItemDefault = {
  id: string;
  created_at: number;
  updated_at: number;
};

// ListReq is used to add a list of responses to a fixed payload
type ListRes<
  ListItem,
  OmitItemKeys extends keyof ListItemDefault | undefined = undefined,
> = {
  total: number;
  list: Prettify<Omit<Overwrite<ListItemDefault, ListItem>, OmitItemKeys>>[];
};

type ObjRes<T, noDefault = false> = Prettify<{
  value: noDefault extends true ? T : T & ListItemDefault;
  key: string;
  warning_msg?: string;
  error_msg?: string;
}>;

type WithLoading<T = unknown> = T & { isLoading: boolean };
